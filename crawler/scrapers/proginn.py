import random
import time
import requests
from config import USER_AGENTS


class ProginnScraper:
    API_URL = "https://www.proginn.com/api/v2/projects"
    PLATFORM = "proginn"

    def fetch(self, pages: int = 2) -> list[dict]:
        jobs = []
        for page in range(1, pages + 1):
            try:
                headers = {
                    "User-Agent": random.choice(USER_AGENTS),
                    "Referer": "https://www.proginn.com/outsourcing",
                }
                resp = requests.get(
                    self.API_URL,
                    params={"page": page, "per_page": 20},
                    headers=headers,
                    timeout=15,
                )
                resp.raise_for_status()
                data = resp.json()
                jobs.extend(self._parse(data))
                time.sleep(random.uniform(3, 5))
            except Exception as e:
                print(f"[proginn] 第 {page} 页抓取失败: {e}")
        return jobs

    def _parse(self, data: dict) -> list[dict]:
        items = []
        projects = data.get("data", {}).get("items", [])
        for p in projects:
            try:
                external_id = str(p.get("id", ""))
                if not external_id:
                    continue

                budget = None
                if p.get("budget"):
                    try:
                        budget = int(float(str(p["budget"]).replace(",", "")))
                    except ValueError:
                        pass

                items.append({
                    "platform": self.PLATFORM,
                    "external_id": external_id,
                    "title": p.get("title", ""),
                    "description": p.get("description", ""),
                    "budget": budget,
                    "url": f"https://www.proginn.com/outsourcing/{external_id}",
                })
            except Exception as e:
                print(f"[proginn] 解析条目失败: {e}")
        return items
