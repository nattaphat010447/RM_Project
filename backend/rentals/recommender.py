import torch
import torch.nn as nn
import torch.nn.functional as F
from torch_geometric.nn import LGConv
import os


# ─── V1 Model (2 behaviors: CART + RENT) ──────────────────────────────────────

class _BehaviorGCN_V1(nn.Module):
    def __init__(self, num_layers=1):
        super().__init__()
        self.convs = nn.ModuleList([LGConv() for _ in range(num_layers)])

    def forward(self, x, edge_index):
        embs = [x]
        for conv in self.convs:
            x = conv(x, edge_index)
            embs.append(x)
        return torch.stack(embs, dim=1).mean(dim=1)


class MBCGCN_TwoBehaviors(nn.Module):
    def __init__(self, num_users, num_items, embed_dim, cart_layers=1, rent_layers=1):
        super().__init__()
        self.user_emb = nn.Embedding(num_users, embed_dim)
        self.item_emb = nn.Embedding(num_items, embed_dim)
        self.gcn_cart = _BehaviorGCN_V1(num_layers=cart_layers)
        self.gcn_rent = _BehaviorGCN_V1(num_layers=rent_layers)
        self.trans_user_cart2rent = nn.Linear(embed_dim, embed_dim, bias=False)
        self.trans_item_cart2rent = nn.Linear(embed_dim, embed_dim, bias=False)
        self.w_cart = 0.1
        self.w_rent = 0.9

    def forward(self, edge_index_cart, edge_index_rent):
        u0, i0 = self.user_emb.weight, self.item_emb.weight
        nu, ni = u0.size(0), i0.size(0)
        cart_emb = self.gcn_cart(torch.cat([u0, i0]), edge_index_cart)
        cu, ci = torch.split(cart_emb, [nu, ni])
        ru_init = self.trans_user_cart2rent(cu)
        ri_init = self.trans_item_cart2rent(ci)
        rent_emb = self.gcn_rent(torch.cat([ru_init, ri_init]), edge_index_rent)
        ru, ri = torch.split(rent_emb, [nu, ni])
        return self.w_cart * cu + self.w_rent * ru, self.w_cart * ci + self.w_rent * ri


# ─── V2 Model (3 behaviors: CLICK → CART → RENT, cascading) ──────────────────

class _BehaviorGCN_V2(nn.Module):
    def __init__(self, num_layers=2):
        super().__init__()
        self.convs = nn.ModuleList([LGConv() for _ in range(num_layers)])

    def forward(self, x, edge_index):
        out = x
        layers = [out]
        for conv in self.convs:
            out = conv(out, edge_index)
            layers.append(out)
        return torch.stack(layers, dim=0).mean(dim=0)


class MBCGCN_ThreeBehaviors(nn.Module):
    def __init__(self, num_users, num_items, embed_dim=64,
                 click_layers=1, cart_layers=1, rent_layers=2,
                 adaptive_weights=True):
        super().__init__()
        self.num_users = num_users
        self.num_items = num_items
        self.adaptive_weights = adaptive_weights
        self.user_embedding = nn.Embedding(num_users, embed_dim)
        self.item_embedding = nn.Embedding(num_items, embed_dim)
        self.gcn_click = _BehaviorGCN_V2(num_layers=click_layers)
        self.gcn_cart  = _BehaviorGCN_V2(num_layers=cart_layers)
        self.gcn_rent  = _BehaviorGCN_V2(num_layers=rent_layers)
        self.trans_click2cart = nn.Linear(embed_dim, embed_dim, bias=False)
        self.trans_cart2rent  = nn.Linear(embed_dim, embed_dim, bias=False)
        if adaptive_weights:
            self.weight_logits = nn.Parameter(torch.tensor([0.5, 1.5, 3.0]))
        else:
            self.register_buffer('w_click', torch.tensor(0.05))
            self.register_buffer('w_cart',  torch.tensor(0.15))
            self.register_buffer('w_rent',  torch.tensor(0.80))

    def forward(self, edge_index_click, edge_index_cart, edge_index_rent):
        x = torch.cat([self.user_embedding.weight, self.item_embedding.weight], dim=0)
        x_click = self.gcn_click(x, edge_index_click)
        x_cart  = self.gcn_cart(self.trans_click2cart(x_click), edge_index_cart)
        x_rent  = self.gcn_rent(self.trans_cart2rent(x_cart),   edge_index_rent)
        if self.adaptive_weights:
            w = F.softmax(self.weight_logits, dim=0)
            x_final = w[0] * x_click + w[1] * x_cart + w[2] * x_rent
        else:
            x_final = self.w_click * x_click + self.w_cart * x_cart + self.w_rent * x_rent
        return x_final[:self.num_users], x_final[self.num_users:]


# ─── Service ──────────────────────────────────────────────────────────────────

class RecommenderService:
    _instance = None

    def __new__(cls):
        if cls._instance is None:
            instance = super().__new__(cls)
            try:
                instance._init_service()
            except Exception:
                # Don't cache a half-initialised instance; next call will retry
                raise
            cls._instance = instance
        return cls._instance

    def _init_service(self):
        print("Initializing Recommender Service")

        # Resolve ml_model path (Docker: ml_model inside backend dir; local: sibling of backend)
        backend_dir = os.path.dirname(os.path.dirname(__file__))
        if os.path.exists(os.path.join(backend_dir, 'ml_model')):
            ml_model_path = os.path.join(backend_dir, 'ml_model')
        else:
            ml_model_path = os.path.join(os.path.dirname(backend_dir), 'ml_model')

        v2_weight = os.path.join(ml_model_path, 'weights', 'mbcgcn_v2_manga_weights.pth')
        v2_data   = os.path.join(ml_model_path, 'data',    'mbcgcn_v2_graph_data.pt')
        v1_weight = os.path.join(ml_model_path, 'weights', 'mbcgcn_manga_weights.pth')
        v1_data   = os.path.join(ml_model_path, 'data',    'mbcgcn_graph_data.pt')
        leg_base  = os.path.join(os.path.dirname(__file__), 'ml_models')
        leg_weight = os.path.join(leg_base, 'mbcgcn_model_weights.pth')
        leg_data   = os.path.join(leg_base, 'mbcgcn_graph_data.pt')

        # Read active version and optional pinned log from DB config
        try:
            from .models import ModelConfig
            cfg = ModelConfig.get()
            preferred = cfg.active_version
            active_log = cfg.active_log
        except Exception:
            preferred = 'v1'
            active_log = None

        # Build ordered candidate list
        if active_log and active_log.weight_path and active_log.graph_path:
            if os.path.exists(active_log.weight_path) and os.path.exists(active_log.graph_path):
                ver = 'v2' if active_log.model_name == 'MB-CGCN-v2' else 'v1'
                candidates = [(ver, active_log.weight_path, active_log.graph_path)]
                print(f"Loading pinned log #{active_log.id} ({active_log.model_name})")
            else:
                print(f"Warning: pinned log #{active_log.id} paths not found, falling back to default")
                active_log = None

        if not active_log:
            if preferred == 'v2':
                candidates = [('v2', v2_weight, v2_data), ('v1', v1_weight, v1_data), ('v1', leg_weight, leg_data)]
            else:
                candidates = [('v1', v1_weight, v1_data), ('v1', leg_weight, leg_data), ('v2', v2_weight, v2_data)]

        self.device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')

        loaded = False
        last_error = None
        for ver, wp, dp in candidates:
            if not (os.path.exists(wp) and os.path.exists(dp)):
                continue
            try:
                print(f"Trying MB-CGCN {ver}: {wp}")
                graph_data = torch.load(dp, map_location=self.device, weights_only=False)
                num_users = graph_data['num_users']
                num_items = graph_data['num_items']

                if ver == 'v2':
                    user_mapping = {int(k): v for k, v in graph_data['user_id_map'].items()}
                    item_mapping = {int(k): v for k, v in graph_data['manga_id_map'].items()}
                    model = MBCGCN_ThreeBehaviors(
                        num_users, num_items, embed_dim=64,
                        click_layers=1, cart_layers=1, rent_layers=2, adaptive_weights=True,
                    )
                else:
                    user_mapping = graph_data['user_mapping']
                    item_mapping = graph_data['item_mapping']
                    model = MBCGCN_TwoBehaviors(
                        num_users, num_items, embed_dim=32,
                        cart_layers=1, rent_layers=1,
                    )

                ckpt = torch.load(wp, map_location=self.device, weights_only=False)
                state_dict = ckpt['model_state_dict'] if isinstance(ckpt, dict) and 'model_state_dict' in ckpt else ckpt
                model.load_state_dict(state_dict)

                # Success — commit to self
                self.model_version = ver
                self.graph_data = graph_data
                self.num_users = num_users
                self.num_items = num_items
                self.user_mapping = user_mapping
                self.item_mapping = item_mapping
                self.rev_item_mapping = {idx: iid for iid, idx in item_mapping.items()}
                self.model = model
                self.model.to(self.device)
                self.model.eval()
                print(f"Loaded MB-CGCN {ver} | users={num_users} items={num_items}")
                loaded = True
                break
            except RuntimeError as e:
                if 'size mismatch' in str(e):
                    print(f"Warning: skipping {ver} ({wp}) — weights/graph size mismatch. "
                          "Retrain this model to fix.")
                    last_error = e
                    continue
                raise

        if not loaded:
            if last_error:
                raise RuntimeError(
                    "All available models have a weights/graph size mismatch. "
                    "Please retrain from the admin panel."
                ) from last_error
            raise FileNotFoundError(
                "No trained MB-CGCN model found. Run training from the admin panel.\n"
                f"Expected v2: {v2_weight}\n"
                f"Expected v1: {v1_weight}"
            )

    def _forward(self):
        if self.model_version == 'v2':
            e_click = self.graph_data['edge_index_click_train'].to(self.device)
            e_cart  = self.graph_data['edge_index_cart_train'].to(self.device)
            e_rent  = self.graph_data['edge_index_rent_train'].to(self.device)
            return self.model(e_click, e_cart, e_rent)
        else:
            e_cart = self.graph_data['edge_index_cart'].to(self.device)
            e_rent = self.graph_data['edge_index_rent_train'].to(self.device)
            return self.model(e_cart, e_rent)

    def _pop_penalty(self):
        """log(degree + 2) popularity penalty from the rent graph."""
        edge = self.graph_data['edge_index_rent_train'].to(self.device)
        # item nodes are offset by num_users in the bipartite graph
        item_col = edge[1]
        if self.model_version == 'v2':
            # v2: item nodes are offset by num_users, strip the offset
            item_col = item_col[item_col >= self.num_users] - self.num_users
        degrees = torch.bincount(item_col, minlength=self.num_items).float()
        return torch.log(degrees + 2.0)

    def get_recommendations(self, user_key, top_k=10):
        """user_key: user.id (v2) or username string (v1)."""
        if user_key not in self.user_mapping:
            return []
        user_idx = self.user_mapping[user_key]
        with torch.no_grad():
            final_u_emb, final_i_emb = self._forward()
            scores = torch.matmul(final_i_emb, final_u_emb[user_idx])
            scores = scores / self._pop_penalty()
            k = min(top_k, scores.size(0))
            return [self.rev_item_mapping[i] for i in torch.topk(scores, k).indices.cpu().tolist()]

    def get_item_based_recommendations(self, history_ids, top_k=10):
        """history_ids: list of manga.id (v2) or mbrs_id (v1)."""
        valid_idxs = [self.item_mapping[i] for i in history_ids if i in self.item_mapping]
        if not valid_idxs:
            return []
        with torch.no_grad():
            _, final_i_emb = self._forward()
            pseudo_emb = final_i_emb[valid_idxs].mean(dim=0)
            scores = torch.matmul(final_i_emb, pseudo_emb)
            scores = scores / self._pop_penalty()
            scores[valid_idxs] = -float('inf')
            k = min(top_k, scores.size(0))
            return [self.rev_item_mapping[i] for i in torch.topk(scores, k).indices.cpu().tolist()]

    def get_recommendations_with_explanations(self, user_key=None, preference_ids=None, top_k=10):
        """
        user_key: user.id (v2) or username (v1)
        preference_ids: list of manga.id (v2) or mbrs_id (v1)
        Returns [(item_id, explanation_type, source_ids), ...]
        """
        with torch.no_grad():
            final_u_emb, final_i_emb = self._forward()
            penalty = self._pop_penalty()

            if user_key and user_key in self.user_mapping:
                user_idx = self.user_mapping[user_key]
                scores = torch.matmul(final_i_emb, final_u_emb[user_idx]) / penalty
                k = min(top_k, scores.size(0))
                return [
                    (self.rev_item_mapping[i], 'user_history', [])
                    for i in torch.topk(scores, k).indices.cpu().tolist()
                ]

            if preference_ids:
                valid_idxs = [self.item_mapping[i] for i in preference_ids if i in self.item_mapping]
                if valid_idxs:
                    pseudo_emb = final_i_emb[valid_idxs].mean(dim=0)
                    scores = torch.matmul(final_i_emb, pseudo_emb) / penalty
                    scores[valid_idxs] = -float('inf')
                    k = min(top_k, scores.size(0))
                    return [
                        (self.rev_item_mapping[i], 'preferences', preference_ids)
                        for i in torch.topk(scores, k).indices.cpu().tolist()
                    ]

            return []


def genre_rerank(rec_with_explanations, manga_queryset, preference_genres,
                 genre_bonus=0.5, expand_k=200, extra_manga_qs=None):
    """
    Re-rank recommendations using multiplicative genre bonus.

    Model rank score is the base; genre overlap adds a percentage boost on top.
    Items the model doesn't know (injected via extra_manga_qs) get a small
    base score so they can only win when genre overlap is strong.

    preference_genres: dict of {genre: count} — Sports x4 gets 4x weight vs
      a genre that appears once. Also accepts a plain set.
    genre_bonus: maximum multiplier added for a perfect genre match (default 0.5
      means a full match boosts the model score by up to 50%).
    expand_k: how many model candidates to consider before re-ranking.
    extra_manga_qs: Manga objects to inject into the candidate pool even if
      the model ranked them outside top-k.
    """
    if not preference_genres or not rec_with_explanations:
        return rec_with_explanations

    # Normalize to weighted dict {genre_lower: weight 0..1}
    if isinstance(preference_genres, set):
        genre_weights = {g.strip().lower(): 1.0 for g in preference_genres}
    else:
        total_count = sum(preference_genres.values()) or 1
        genre_weights = {g.strip().lower(): c / total_count for g, c in preference_genres.items()}

    # Normalize item_ids to plain int — model returns np.int64 which won't match
    # Django ORM int keys in dict lookups.
    candidates = [(int(item_id), et, src) for item_id, et, src in rec_with_explanations[:expand_k]]
    existing_ids = {item_id for item_id, _, _ in candidates}

    # Inject extra genre-matched manga that didn't make model's top-k.
    # They get an adaptive base score: higher when the user's preferences
    # are concentrated in one genre (e.g. Sports x4 out of 9 total → 0.44
    # top-weight → injected_base ≈ 0.30).
    top_genre_weight = max(genre_weights.values()) if genre_weights else 0.0
    injected_base = 0.15 + 0.35 * top_genre_weight  # range 0.15..0.50
    if extra_manga_qs:
        for manga in extra_manga_qs:
            key = manga.mbrs_id if hasattr(manga, 'mbrs_id') and manga.mbrs_id else manga.id
            if key not in existing_ids:
                candidates.append((key, 'preferences', []))
                manga_queryset[key] = manga
                existing_ids.add(key)

    total_model = len(rec_with_explanations[:expand_k])  # denominator for rank → score
    max_possible = sum(genre_weights.values()) or 1.0

    def genre_overlap_ratio(manga):
        if not manga or not manga.genre:
            return 0.0
        mg = {g.strip().lower() for g in manga.genre.split(',')}
        return min(sum(genre_weights.get(g, 0.0) for g in mg) / max_possible, 1.0)

    scored = []
    for rank, (item_id, exp_type, src_ids) in enumerate(candidates):
        if rank < total_model:
            # Items that came from the model keep their rank-based score
            model_score = 1.0 - (rank / total_model)
        else:
            # Injected items: fixed low base so they only win on genre strength
            model_score = injected_base

        manga = manga_queryset.get(item_id)
        g_ratio = genre_overlap_ratio(manga)
        # Multiplicative: genre match boosts model score, never replaces it
        final = model_score * (1.0 + genre_bonus * g_ratio)
        scored.append((final, item_id, exp_type, src_ids))

    scored.sort(key=lambda x: x[0], reverse=True)
    return [(iid, et, src) for _, iid, et, src in scored]

