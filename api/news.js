export default async function handler(req, res) {

  const feeds = [
    "https://www.gov.pl/rss",
    "https://www.money.pl/rss/",
    "https://www.bankier.pl/rss/wiadomosci.xml",
    "https://feeds.reuters.com/reuters/worldNews",
    "http://feeds.bbci.co.uk/news/world/rss.xml",
    "https://www.cnbc.com/id/100003114/device/rss/rss.html",
    "https://www.aljazeera.com/xml/rss/all.xml"
  ];

  function looksEnglish(text){
    if(!text) return false;
    const polishChars = /[ąćęłńóśźż]/i;
    if(polishChars.test(text)) return false;
    return true;
  }

  async function translateText(text){
    if(!text) return "";
    if(!looksEnglish(text)) return text;

    try{
      const response = await fetch("https://translate.argosopentech.com/translate",{
        method:"POST",
        headers:{ "Content-Type":"application/json" },
        body: JSON.stringify({
          q: text.slice(0,200),
          source: "auto",
          target: "pl",
          format: "text"
        })
      });

      const data = await response.json();
      return data.translatedText || text;

    } catch {
      return text;
    }
  }

  function calculateRisk(text){
    const t = text.toLowerCase();
    if(t.includes("war")||t.includes("wojna")||t.includes("atak")) return 9;
    if(t.includes("bank")||t.includes("ropa")||t.includes("oil")) return 7;
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
        all = all.concat(items.slice(0,4));
      }catch{}
    }

    all.sort((a,b)=>new Date(b.pubDate)-new Date(a.pubDate));

    const selected = all.slice(0,15);

    const translated = await Promise.all(
      selected.map(async item => {

        const rawTitle = item.title;
        const rawDesc = item.description?.replace(/<[^>]+>/g,'').slice(0,200);

        const titlePL = await translateText(rawTitle);
        const descPL = await translateText(rawDesc);

        return {
          title: titlePL,
          description: descPL,
          pubDate: item.pubDate,
          risk: calculateRisk(titlePL),
          category: detectCategory(titlePL),
          link: item.link
        };
      })
    );

    res.status(200).json({
      success: true,
      count: translated.length,
      news: translated
    });

  } catch {
    res.status(500).json({
      success:false,
      error:"Backend error"
    });
  }
}
