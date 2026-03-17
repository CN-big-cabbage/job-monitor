import random
import time
import requests
from bs4 import BeautifulSoup
from config import USER_AGENTS


class ZhubajieScraper:
    BASE_URL = "https://task.zbj.com/t/ppsj/p{}o0.html"
    PLATFORM = "zhubajie"

    def fetch(self, pages: int = 2) -> list[dict]:
        jobs = []
        for page in range(1, pages + 1):
            try:
                url = self.BASE_URL.format(page)
                headers = {"User-Agent": random.choice(USER_AGENTS)}
                resp = requests.get(url, headers=headers, timeout=15)
                resp.raise_for_status()
                jobs.extend(self._parse(resp.text))
                time.sleep(random.uniform(3, 5))
            except Exception as e:
                print(f"[zhubajie] 第 {page} 页抓取失败: {e}")
        return jobs

    def _parse(self, html: str) -> list[dict]:
        soup = BeautifulSoup(html, "html.parser")
        items = []
        for task in soup.select(".new-taskdetail-container .task-item"):
            try:
                title_el = task.select_one(".task-title-text a")
                price_el = task.select_one(".task-price span")
                if not title_el:
                    continue

                href = title_el.get("href", "")
                external_id = href.strip("/").split("/")[-1] if href else ""

                budget = None
                if price_el:
                    price_text = price_el.get_text(strip=True).replace("¥", "").replace(",", "")
                    try:
                        budget = int(float(price_text))
                    except ValueError:
                        pass

                items.append({
                    "platform": self.PLATFORM,
                    "external_id": external_id,
                    "title": title_el.get_text(strip=True),
                    "description": None,
                    "budget": budget,
                    "url": href if href.startswith("http") else f"https://task.zbj.com{href}",
                })
            except Exception as e:
                print(f"[zhubajie] 解析条目失败: {e}")
        return items
