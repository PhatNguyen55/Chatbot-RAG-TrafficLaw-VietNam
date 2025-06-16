# alembic/env.py
from logging.config import fileConfig
from sqlalchemy import engine_from_config
from sqlalchemy import pool
from alembic import context

# Import các thành phần của bạn
from app.core.config import settings
from app.db.base import Base # Đảm bảo file này import tất cả models

# Lấy đối tượng config của Alembic
config = context.config

# Thiết lập logging từ file .ini
if config.config_file_name is not None:
    fileConfig(config.config_file_name)

# Ghi đè URL bằng giá trị SYNC_DATABASE_URL từ settings.py
config.set_main_option("sqlalchemy.url", settings.SYNC_DATABASE_URL)

# Gán metadata của model
target_metadata = Base.metadata

def run_migrations_online() -> None:
    """Run migrations in 'online' mode (Synchronous version)."""
    # Logic này bây giờ sẽ hoạt động vì config đã có đúng URL đồng bộ
    connectable = engine_from_config(
        config.get_section(config.config_ini_section, {}),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )

    with connectable.connect() as connection:
        context.configure(
            connection=connection, target_metadata=target_metadata
        )

        with context.begin_transaction():
            context.run_migrations()

# Chỉ cần chạy online mode
run_migrations_online()