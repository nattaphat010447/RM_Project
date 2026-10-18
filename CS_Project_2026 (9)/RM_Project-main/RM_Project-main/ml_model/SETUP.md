# ML Model Setup Guide

This guide helps you set up the ml_model/ folder structure for the Manga Rental recommendation system.

## Option 1: Copy Existing Models

If you already have trained models in `backend/rentals/ml_models/`, copy them to the new structure:

```bash
python ml_model/scripts/copy_existing_models.py
```

This will:
- Copy `Anime.csv` to `ml_model/data/`
- Copy `mbcgcn_graph_data.pt` to `ml_model/data/`
- Copy `mbcgcn_model_weights.pth` to `ml_model/weights/` (renamed to `mbcgcn_manga_weights.pth`)
- Backend will automatically detect and use the new location

## Option 2: Train from Scratch

### Step 1: Prepare Data

Place your CSV files in `ml_model/data/`:
- `Anime.csv`
- `User-AnimeReview.csv`

```bash
cd ml_model
python scripts/prepare_data.py
```

### Step 2: Install Dependencies

```bash
pip install -r requirements.txt
```

For PyTorch with CUDA (recommended for GPU):
```bash
pip install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cu118
pip install torch-geometric
```

### Step 3: Train Models

**Train MB-CGCN (main model):**
```bash
python scripts/train.py
```

**Train baselines for comparison:**
```bash
python scripts/train_baselines.py
```

## Folder Structure After Setup

```
ml_model/
├── data/
│   ├── Anime.csv                    # Manga metadata
│   ├── User-AnimeReview.csv         # User interactions
│   └── mbcgcn_graph_data.pt         # Prepared graph data
├── weights/
│   ├── mbcgcn_manga_weights.pth     # Main model ✓
│   ├── baseline_mf_weights.pth      # Baseline 1
│   └── baseline_lightgcn_weights.pth # Baseline 2
├── models/
│   ├── mbcgcn.py                    # Model architecture
│   └── baselines.py
└── scripts/
    ├── prepare_data.py
    ├── train.py
    └── train_baselines.py
```

## Verification

Check if the backend can find your models:

```bash
cd backend
python manage.py shell

>>> from rentals.recommender import RecommenderService
>>> service = RecommenderService()
```

You should see:
```
ระบบกำลังเริ่มต้น Recommender Service
โหลดโมเดลจาก ml_model/ folder
โหลดข้อมูล Graph สำเร็จ
...
```

## Troubleshooting

### "Model not found" error
- Make sure `ml_model/weights/mbcgcn_manga_weights.pth` exists
- Run `copy_existing_models.py` if migrating from old structure
- Or train new model with `train.py`

### "Graph data not found" error
- Make sure `ml_model/data/mbcgcn_graph_data.pt` exists
- Run `prepare_data.py` to generate it

### CUDA out of memory
- Reduce `batch_size` in training scripts (default: 400000)
- Use CPU by setting `device='cpu'` (slower but works)

## Training Time Estimates

| Hardware | MB-CGCN (600 epochs) | Baselines (600 epochs each) |
|----------|----------------------|------------------------------|
| GPU (RTX 3060) | ~2-3 hours | ~4-5 hours total |
| CPU (8 cores) | ~10-15 hours | ~20-25 hours total |

## Production Deployment

For production, you only need:
```
ml_model/
├── data/
│   ├── Anime.csv
│   └── mbcgcn_graph_data.pt
├── weights/
│   └── mbcgcn_manga_weights.pth
└── models/
    ├── __init__.py
    └── mbcgcn.py
```

Training scripts and baselines are optional in production.

## Re-training Schedule

Recommended re-training frequency:
- **Weekly:** If you have high user activity (1000+ new interactions/week)
- **Monthly:** For moderate activity (100-1000 new interactions/week)
- **Quarterly:** For stable catalogs with low activity

Update process:
1. Export latest interaction data to CSV
2. Run `prepare_data.py`
3. Run `train.py`
4. Restart Django server (backend will auto-load new weights)
