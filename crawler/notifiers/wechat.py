import os
import requests

SITE_URL = os.environ.get("SITE_URL", "https://your-domain.vercel.app")


def send_wechat(
    send_key: str,
    job: dict,
    matched_keywords: list[str],
    notification_id: str,
) -> bool:
    short_link = f"{SITE_URL}/api/go/{notification_id}"
    budget_text = f"¥{job['budget']:,}" if job.get("budget") else "面议"
    platform_names = {"zhubajie": "猪八戒", "proginn": "程序员客栈"}

    title = f"新需求匹配 - {job['title'][:30]}"
    content = (
        f"**{job['title']}**\n\n"
        f"- 平台：{platform_names.get(job['platform'], job['platform'])}\n"
        f"- 预算：{budget_text}\n"
        f"- 命中关键词：{', '.join(matched_keywords)}\n\n"
        f"[查看详情]({short_link})"
    )

    try:
        resp = requests.post(
            f"https://sctapi.ftqq.com/{send_key}.send",
            data={"title": title, "desp": content},
            timeout=10,
        )
        return resp.status_code == 200
    except Exception as e:
        print(f"[wechat] 发送失败: {e}")
        return False
