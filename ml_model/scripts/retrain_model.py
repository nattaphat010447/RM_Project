import os
import sys
import json
import torch
from datetime import datetime

# Add project root to path
project_root = os.path.dirname(os.path.dirname(os.path.dirname(__file__)))
sys.path.insert(0, project_root)

# Django setup
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.rental_system.settings')
import django
django.setup()

from backend.rentals.models import ModelTrainingLog

def prepare_data():
    """Prepare training data from database"""
    from ml_model.scripts.prepare_data import export_interactions_from_db

    print("📊 Preparing training data...")
    cart_file = os.path.join(project_root, 'ml_model', 'data', 'cart_interactions.csv')
    rent_file = os.path.join(project_root, 'ml_model', 'data', 'rent_interactions.csv')

    export_interactions_from_db(cart_file, rent_file)
    print("✅ Data prepared")

    return cart_file, rent_file

def train_model(log_id):
    """Train the MB-CGCN model"""
    from ml_model.scripts.train import main as train_main

    log = ModelTrainingLog.objects.get(id=log_id)
    log.status = 'RUNNING'
    log.started_at = datetime.now()
    log.save()

    try:
        print("🚀 Starting model training...")

        # Run training script
        cart_file, rent_file = prepare_data()
        metrics = train_main()  # Returns final metrics

        # Update log with results
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

        print("✅ Training completed successfully!")
        print(f"   Recall@10: {log.final_recall_at_10}")
        print(f"   NDCG@10: {log.final_ndcg_at_10}")

        # Reload model in recommender service
        reload_recommender_service()

        return True

    except Exception as e:
        print(f"❌ Training failed: {str(e)}")
        log.status = 'FAILED'
        log.error_message = str(e)
        log.completed_at = datetime.now()
        log.save()
        return False

def reload_recommender_service():
    """Force reload the recommender service with new weights"""
    from backend.rentals.recommender import RecommenderService

    print("🔄 Reloading recommender service...")

    # Clear singleton instance
    RecommenderService._instance = None

    # Reinitialize
    service = RecommenderService()

    print("✅ Recommender service reloaded")

def create_training_job():
    """Create a new training job entry"""
    log = ModelTrainingLog.objects.create(
        model_name='MB-CGCN',
        status='PENDING'
    )
    return log.id

if __name__ == '__main__':
    print("=" * 60)
    print("🤖 MB-CGCN Model Retraining Script")
    print("=" * 60)

    log_id = create_training_job()
    success = train_model(log_id)

    if success:
        print("\n🎉 Model retrained and deployed successfully!")
    else:
        print("\n⚠️ Training failed. Check logs for details.")

    sys.exit(0 if success else 1)
