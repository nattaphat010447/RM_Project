# ML Model - MB-CGCN for Manga Recommendation

Multi-Behavior Cascading Graph Convolutional Network (MB-CGCN) for personalized manga recommendations.

## Folder Structure

```
ml_model/
├── data/                      # Training data (CSV, graph data)
│   ├── Anime.csv
│   ├── User-AnimeReview.csv
│   └── mbcgcn_graph_data.pt
├── models/                    # Model architectures
│   ├── __init__.py
│   ├── mbcgcn.py             # MB-CGCN model
│   └── baselines.py          # Baseline models (MF, LightGCN)
├── weights/                   # Trained model weights
│   ├── mbcgcn_manga_weights.pth
│   ├── baseline_mf_weights.pth
│   └── baseline_lightgcn_weights.pth
├── scripts/                   # Training scripts
│   ├── prepare_data.py       # Data preparation
│   ├── train.py              # Train MB-CGCN
│   └── train_baselines.py    # Train baseline models
├── requirements.txt           # Python dependencies
└── README.md                  # This file
```

## Quick Start

### 1. Install Dependencies

```bash
cd ml_model
pip install -r requirements.txt
```

### 2. Prepare Data

Place your CSV files in `data/` folder:
- `Anime.csv` - Manga metadata
- `User-AnimeReview.csv` - User interaction data

```bash
python scripts/prepare_data.py
```

This will generate `data/mbcgcn_graph_data.pt` containing:
- User-manga interaction graphs
- Train/test split (80/20)
- User and item mappings

### 3. Train Models

**Train MB-CGCN (Proposed Model):**
```bash
python scripts/train.py
```

**Train Baseline Models (MF + LightGCN):**
```bash
python scripts/train_baselines.py
```

## Model Architecture

### MB-CGCN (Multi-Behavior Cascading GCN)

```
Input: User-Item Graphs (CART + RENT behaviors)
  ↓
CART Behavior GCN (1 layer)
  ↓
Transform Layer (CART → RENT)
  ↓
RENT Behavior GCN (1 layer)
  ↓
Weighted Fusion (0.1 × CART + 0.9 × RENT)
  ↓
Output: User & Item Embeddings
```

**Key Features:**
- **Two Behaviors:**
  - CART: "Plan to Watch" (browsing behavior)
  - RENT: "Watching" + "Completed" (actual rental)
- **Cascade Architecture:** CART embeddings feed into RENT
- **Weighted Fusion:** RENT behavior weighted 9× more than CART
- **Cosine Similarity:** For recommendation scoring

### Baselines

1. **Matrix Factorization (MF):** Simple collaborative filtering
2. **LightGCN:** Single-behavior GCN (RENT only)

## Training Configuration

Default hyperparameters (as in paper):

```python
embed_dim = 64          # Embedding dimension
epochs = 600            # Training epochs
batch_size = 400000     # Interactions per batch
lr = 0.001              # Learning rate
l2_lambda = 0.02        # L2 regularization
tau = 0.05              # Temperature for BPR loss
w_cart = 0.1            # CART behavior weight
w_rent = 0.9            # RENT behavior weight
```

## Performance (Final Epoch 600)

| Model | Recall@10 | NDCG@10 | Recall@20 | NDCG@20 |
|-------|-----------|---------|-----------|---------|
| **MB-CGCN** | **0.0524** | **0.0427** | **0.0799** | **0.0510** |
| Baseline MF | 0.0375 | 0.0339 | 0.0584 | 0.0400 |
| LightGCN | 0.0415 | 0.0365 | 0.0653 | 0.0435 |

## Integration with Backend

The trained model is used by the Django backend for recommendations:

```python
# backend/rentals/recommender.py loads from ml_model/weights/
model_path = 'ml_model/weights/mbcgcn_manga_weights.pth'
graph_path = 'ml_model/data/mbcgcn_graph_data.pt'
```

## Training Tips

1. **GPU Recommended:** Training takes ~2-3 hours on GPU (600 epochs)
2. **Memory:** ~4GB VRAM required for full dataset
3. **Early Stopping:** Monitor Recall@10 - usually converges around epoch 400-500
4. **Data Quality:** Better user-manga interactions = better recommendations

## Advanced Usage

### Custom Training Parameters

```python
from scripts.train import train_mbcgcn

train_mbcgcn(
    data_path='data/mbcgcn_graph_data.pt',
    output_path='weights/custom_weights.pth',
    embed_dim=128,           # Larger embeddings
    epochs=300,              # Fewer epochs
    w_cart=0.2,              # More cart weight
    w_rent=0.8,
    eval_every=10            # Evaluate more frequently
)
```

### Evaluate Existing Model

```python
import torch
from models.mbcgcn import MBCGCN_TwoBehaviors

data = torch.load('data/mbcgcn_graph_data.pt')
model = MBCGCN_TwoBehaviors(data['num_users'], data['num_items'], embed_dim=64)
model.load_state_dict(torch.load('weights/mbcgcn_manga_weights.pth'))
model.eval()

# Use for inference
```

## References

Based on the training notebook: `rmdatasettrain.py`

Key techniques:
- **BPR Loss:** Bayesian Personalized Ranking
- **Negative Sampling:** Popularity-biased (power 0.75)
- **Graph Convolution:** LightGCN-style (no activation)
- **Temperature Scaling:** τ=0.05 for sharper gradients

## Important Notes

1. **Model Expects:** User/Item indices (not raw IDs)
2. **Mapping Required:** Use `user_mapping` and `item_mapping` from graph data
3. **Cold Start:** New users/items not in training data need fallback strategy
4. **Batch Inference:** For production, batch recommendations for efficiency
