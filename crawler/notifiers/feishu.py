import os
import requests

SITE_URL = os.environ.get("SITE_URL", "https://your-domain.vercel.app")


def send_feishu(
    webhook_url: str,
    job: dict,
    matched_keywords: list[str],
    notification_id: str,
) -> bool:
    short_link = f"{SITE_URL}/api/go/{notification_id}"
    budget_text = f"¥{job['budget']:,}" if job.get("budget") else "面议"

    payload = {
        "msg_type": "interactive",
        "card": {
            "header": {
                "title": {"tag": "plain_text", "content": "新需求匹配！"},
                "template": "blue",
            },
            "elements": [
                {
                    "tag": "div",
                    "text": {
                        "tag": "lark_md",
                        "content": (
                            f"**{job['title']}**\n"
                            f"平台：{job['platform']}\n"
                            f"预算：{budget_text}\n"
                            f"命中关键词：{', '.join(matched_keywords)}"
                        ),
                    },
                },
                {
                    "tag": "action",
                    "actions": [
                        {
                            "tag": "button",
                            "text": {"tag": "plain_text", "content": "查看详情"},
                            "url": short_link,
                            "type": "primary",
                        }
                    ],
                },
            ],
        },
    }

    try:
        resp = requests.post(webhook_url, json=payload, timeout=10)
        return resp.status_code == 200
    except Exception as e:
        print(f"[feishu] 发送失败: {e}")
        return False
