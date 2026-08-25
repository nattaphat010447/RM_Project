"""
Retrain wrapper for MB-CGCN v1 (2 behaviors: CART -> RENT) - called from Django admin.

This script:
1. Finds the PENDING ModelTrainingLog created by admin_ml_views.trigger_model_retrain()
2. Runs prepare_data.prepare_graph_data() against the MAL-style CSV dataset
3. Runs train.main() to train the model
4. Updates ModelTrainingLog with results
5. Reloads RecommenderService
"""
import os
import sys
import django
from datetime import datetime

# Setup Django
# In Docker: script is at /app/ml_model/scripts/retrain_model.py, Django app is at /app
# In Local:  script is at <project>/ml_model/scripts/retrain_model.py, Django app is at <project>/backend
script_dir   = os.path.dirname(os.path.abspath(__file__))
project_root = os.path.dirname(os.path.dirname(script_dir))  # <project root>
backend_path = os.path.join(project_root, 'backend')

# Docker: backend files sit directly in project_root (/app), no 'backend' subdirectory
if not os.path.exists(os.path.join(backend_path, 'core')):
    backend_path = project_root

sys.path.insert(0, backend_path)
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from rentals.models import ModelTrainingLog


def prepare_data():
    """Prepare training data from the MAL-style CSV dataset."""
    sys.path.insert(0, os.path.join(project_root, 'ml_model', 'scripts'))
    from prepare_data import prepare_graph_data

    data_dir = os.path.join(project_root, 'ml_model', 'data')
    anime_csv_path = os.path.join(data_dir, 'Anime.csv')
    review_csv_path = os.path.join(data_dir, 'User-AnimeReview.csv')
    output_path = os.path.join(data_dir, 'mbcgcn_graph_data.pt')

    if not os.path.exists(anime_csv_path) or not os.path.exists(review_csv_path):
        raise FileNotFoundError(
            f"Missing dataset files. Expected both:\n"
            f"  {anime_csv_path}\n  {review_csv_path}"
        )

    print("Step 1: Preparing training data...")
    prepare_graph_data(
        anime_csv_path=anime_csv_path,
        review_csv_path=review_csv_path,
        output_path=output_path,
    )
    print("Data prepared")


def reload_recommender_service():
    """Force reload the recommender service with new weights."""
    from rentals.recommender import RecommenderService
    print("Reloading recommender service...")
    RecommenderService._instance = None
    RecommenderService()
    print("Recommender service reloaded")


def main():
    print("=" * 60)
    print("MB-CGCN v1 Model Retraining Script")
    print("=" * 60)

    log = ModelTrainingLog.objects.filter(model_name='MB-CGCN', status='PENDING').order_by('-created_at').first()
    if not log:
        print("No PENDING training log found")
        sys.exit(1)

    log.status = 'RUNNING'
    log.started_at = datetime.now()
    log.save()

    try:
        prepare_data()

        print("Step 2: Training MB-CGCN model...")
        sys.path.insert(0, os.path.join(project_root, 'ml_model', 'scripts'))
        from train import main as train_main
        metrics = train_main()

        log.status = 'COMPLETED'
        log.completed_at = datetime.now()
        log.num_users = metrics.get('num_users', 0)
        log.num_items = metrics.get('num_items', 0)
        log.num_cart_interactions = metrics.get('num_cart', 0)
        log.num_rent_interactions = metrics.get('num_rent', 0)
        log.epochs = metrics.get('epochs', 600)
        log.final_recall_at_10 = metrics.get('recall@10', 0)
        log.final_ndcg_at_10 = metrics.get('ndcg@10', 0)
        log.save()

        print("Training completed successfully!")
        print(f"   Recall@10: {log.final_recall_at_10}")
        print(f"   NDCG@10: {log.final_ndcg_at_10}")

        reload_recommender_service()

        print("\nModel retrained and deployed successfully!")

    except Exception as e:
        print(f"Training failed: {str(e)}")
        log.status = 'FAILED'
        log.error_message = str(e)
        log.completed_at = datetime.now()
        log.save()
        sys.exit(1)


if __name__ == '__main__':
    main()
