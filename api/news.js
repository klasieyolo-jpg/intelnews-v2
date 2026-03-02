export default async function handler(req, res) {

  const feeds = [
    // Polska
    "https://www.gov.pl/rss",
    "https://www.money.pl/rss/",
    "https://www.bankier.pl/rss/wiadomosci.xml",

    // Global
    "https://feeds.reuters.com/reuters/worldNews",
    "http://feeds.bbci.co.uk/news/world/rss.xml",
    "https://www.cnbc.com/id/100003114/device/rss/rss.html",
    "https://www.aljazeera.com/xml/rss/all.xml"
  ];

  const highKeywords = ["war","attack","conflict","invasion","missile","cyber","hack","wojna","atak","zamach"];
  const mediumKeywords = ["bank","oil","gas","sanction","military","crisis","ropa","gaz"];

  function calculateRisk(text){
    const t = text.toLowerCase();
    if(highKeywords.some(k=>t.includes(k))) return 9;
    if(mediumKeywords.some(k=>t.includes(k))) return 7;
    return 4;
  }

  function detectCategory(text){
    const t = text.toLowerCase();
    if(t.includes("cyber")||t.includes("hack")) return "cyber";
    if(t.includes("war")||t.includes("wojna")||t.includes("atak")) return "wojna";
    if(t.includes("bank")||t.includes("oil")||t.includes("ropa")) return "rynki";
    return "all";
  }

  async function fetchFeed(url){
    const api = `https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(url)}`;
    const response = await fetch(api);
    const data = await response.json();
    return data.items || [];
  }

  try {

    let all = [];

    for(const feed of feeds){
      try{
        const items = await fetchFeed(feed);
        all = all.concat(items.slice(0,5));
      }catch(e){}
    }

    all.sort((a,b)=>new Date(b.pubDate)-new Date(a.pubDate));

    const cleaned = all.slice(0,25).map(item => {
      const title = item.title;
      const description = item.description?.replace(/<[^>]+>/g,'').slice(0,180);

      return {
        title,
        description,
        pubDate: item.pubDate,
        risk: calculateRisk(title),
        category: detectCategory(title),
        link: item.link
      };
    });

    res.status(200).json({
      success: true,
      count: cleaned.length,
      news: cleaned
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      error: "Backend error"
    });
  }

}
