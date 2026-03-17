import sys
from scrapers import ZhubajieScraper, ProginnScraper
from notifiers import send_feishu, send_wechat
from db import insert_jobs, get_active_configs, save_notification
from config import FEISHU_DEV_WEBHOOK


def match_keywords(job: dict, keywords: list[str]) -> list[str]:
    """返回匹配到的关键词列表"""
    text = f"{job.get('title', '')} {job.get('description', '')}".lower()
    return [kw for kw in keywords if kw.lower() in text]


def notify(config: dict, job: dict, matched_keywords: list[str], job_id: str) -> bool:
    """发送通知并记录"""
    notification = save_notification(
        user_id=config["user_id"],
        job_id=job_id,
        channel=config["notify_channel"],
        status="sent",
    )
    notification_id = notification.get("id", "")

    if config["notify_channel"] == "feishu":
        success = send_feishu(config["notify_target"], job, matched_keywords, notification_id)
    else:
        success = send_wechat(config["notify_target"], job, matched_keywords, notification_id)

    if not success:
        from db import supabase
        supabase.table("notifications").update({"status": "failed"}).eq("id", notification_id).execute()

    return success


def run():
    print("=== 开始抓取 ===")

    # 1. 抓取职位
    scrapers = [ZhubajieScraper(), ProginnScraper()]
    all_jobs = []
    for scraper in scrapers:
        jobs = scraper.fetch(pages=2)
        print(f"[{scraper.PLATFORM}] 抓取到 {len(jobs)} 条")
        all_jobs.extend(jobs)

    # 2. 去重入库
    new_jobs = insert_jobs(all_jobs)
    print(f"新增 {len(new_jobs)} 条职位")

    if not new_jobs:
        print("无新职位，结束")
        return

    # 3. 匹配并推送
    configs = get_active_configs()
    print(f"活跃配置 {len(configs)} 个")

    sent_count = 0
    fail_count = 0

    for config in configs:
        for job in new_jobs:
            if job["platform"] != config["platform"]:
                continue

            matched = match_keywords(job, config["keywords"])
            if not matched:
                continue

            if config.get("min_budget") and (job.get("budget") or 0) < config["min_budget"]:
                continue

            success = notify(config, job, matched, job["id"])
            if success:
                sent_count += 1
            else:
                fail_count += 1

    print(f"=== 完成：推送 {sent_count} 条，失败 {fail_count} 条 ===")

    # 4. 连续失败告警（给开发者）
    if fail_count > 0 and FEISHU_DEV_WEBHOOK:
        import requests
        requests.post(FEISHU_DEV_WEBHOOK, json={
            "msg_type": "text",
            "content": {"text": f"[告警] 本次推送失败 {fail_count} 条，请检查"},
        }, timeout=10)


if __name__ == "__main__":
    try:
        run()
    except Exception as e:
        print(f"致命错误: {e}", file=sys.stderr)
        sys.exit(1)
