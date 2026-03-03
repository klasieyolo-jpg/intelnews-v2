export default async function handler(req, res) {

  const { url } = req.query;

  if (!url) {
    return res.status(400).json({ success: false, error: "Brak URL" });
  }

  try {

    const response = await fetch(url);
    const html = await response.text();

    // Bardzo proste wyciąganie tekstu z <p>
    const paragraphs = [...html.matchAll(/<p[^>]*>(.*?)<\/p>/gi)]
      .map(match => match[1])
      .join("\n\n");

    // Usuwamy tagi HTML
    const cleanText = paragraphs
      .replace(/<[^>]+>/g, "")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 15000); // limit żeby nie przesadzić

    res.status(200).json({
      success: true,
      content: cleanText
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      error: "Nie udało się pobrać artykułu"
    });
  }

}
