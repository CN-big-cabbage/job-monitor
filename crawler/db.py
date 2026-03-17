from supabase import create_client
from config import SUPABASE_URL, SUPABASE_SERVICE_KEY

supabase = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)


def insert_jobs(jobs: list[dict]) -> list[dict]:
    """插入新职位，返回成功插入的职位列表（去重由 unique 约束处理）"""
    new_jobs = []
    for job in jobs:
        result = supabase.table("jobs").upsert(
            job, on_conflict="platform,external_id", ignore_duplicates=True
        ).execute()
        if result.data:
            new_jobs.append(result.data[0])
    return new_jobs


def get_active_configs() -> list[dict]:
    """获取所有启用的监控配置"""
    result = supabase.table("monitor_configs").select("*").eq("is_active", True).execute()
    return result.data


def save_notification(user_id: str, job_id: str, channel: str, status: str) -> dict:
    """保存推送记录"""
    result = supabase.table("notifications").insert({
        "user_id": user_id,
        "job_id": job_id,
        "channel": channel,
        "status": status,
    }).execute()
    return result.data[0] if result.data else {}
