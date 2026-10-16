// Sugerencias de outfit con el LLM que configure cada usuario (Claude, GPT o Gemini)

export const DEFAULT_MODELS: Record<string, string> = {
  anthropic: 'claude-sonnet-5-5',
  openai: 'gpt-4.1-mini',
  gemini: 'gemini-2.5-flash',
};

async function callLLM(provider: string, key: string, model: string, system: string, user: string): Promise<string> {
  if (provider === 'anthropic') {
    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'x-api-key': key, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
      body: JSON.stringify({ model, max_tokens: 1500, system, messages: [{ role: 'user', content: user }] }),
    });
    const d: any = await r.json();
    if (!r.ok) throw new Error(d?.error?.message || `Claude respondió ${r.status}`);
    return d.content?.filter((c: any) => c.type === 'text').map((c: any) => c.text).join('') || '';
  }
  if (provider === 'openai') {
    const r = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { authorization: `Bearer ${key}`, 'content-type': 'application/json' },
      body: JSON.stringify({
        model,
        response_format: { type: 'json_object' },
        messages: [{ role: 'system', content: system }, { role: 'user', content: user }],
      }),
    });
    const d: any = await r.json();
    if (!r.ok) throw new Error(d?.error?.message || `OpenAI respondió ${r.status}`);
    return d.choices?.[0]?.message?.content || '';
  }
  if (provider === 'gemini') {
    const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`, {
      method: 'POST',
      headers: { 'x-goog-api-key': key, 'content-type': 'application/json' },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: system }] },
        contents: [{ role: 'user', parts: [{ text: user }] }],
        generationConfig: { responseMimeType: 'application/json' },
      }),
    });
    const d: any = await r.json();
    if (!r.ok) throw new Error(d?.error?.message || `Gemini respondió ${r.status}`);
    return d.candidates?.[0]?.content?.parts?.map((p: any) => p.text).join('') || '';
  }
  throw new Error('Proveedor de IA no configurado');
}

function parseJson(text: string): any {
  const m = text.match(/\{[\s\S]*\}/);
  if (!m) throw new Error('La IA no devolvió un JSON válido');
  return JSON.parse(m[0]);
}

export async function suggestOutfit(
  db: D1Database,
  settings: { ai_provider: string; ai_key: string; ai_model?: string },
  body: { dayId: string; profileId: string; slot: string; weather?: string; request?: string },
) {
  const day: any = await db.prepare('SELECT * FROM days WHERE id=?').bind(body.dayId).first();
  const profile: any = await db.prepare('SELECT * FROM profiles WHERE id=?').bind(body.profileId).first();
  if (!day || !profile) throw new Error('Día o perfil no encontrado (¿datos sin sincronizar?)');
  const acts = (await db.prepare('SELECT title,type,start_time,location FROM activities WHERE day_id=? AND (profile_id IS NULL OR profile_id=?)').bind(body.dayId, body.profileId).all()).results;
  const items = (await db.prepare("SELECT id,category,name,color,tags FROM items WHERE kind='ropa' AND profile_id=?").bind(body.profileId).all()).results;
  const others = (await db.prepare('SELECT o.slot, o.items, d.day_number FROM outfits o JOIN days d ON d.id=o.day_id WHERE o.profile_id=? AND o.day_id<>?').bind(body.profileId, body.dayId).all()).results;
  if (!items.length) throw new Error('El catálogo de ropa está vacío');

  const system =
    'Eres un estilista personal experto en viajes en crucero por el Caribe. Respondes SOLO con JSON válido, en español. ' +
    'Debes elegir prendas exclusivamente por su "id" del catálogo dado; nunca inventes ids.';
  const user = `Arma el outfit de ${body.slot === 'noche' ? 'la NOCHE (cena; respeta el código de vestimenta)' : 'el DÍA'} para ${profile.name} (${profile.gender === 'M' ? 'mujer' : 'hombre'}).

Día ${day.day_number} (${day.date || 'sin fecha'}): ${day.type}${day.port ? ' en ' + day.port : ''}${day.country ? ', ' + day.country : ''}.
Código de vestimenta de la noche: ${day.dress_code || 'casual'}.
Clima: ${body.weather || 'desconocido (asume Caribe cálido)'}.
Actividades: ${acts.map((a: any) => `${a.start_time || ''} ${a.title} (${a.type})`).join('; ') || 'ninguna registrada'}.
${body.request ? 'Pedido especial: ' + body.request : ''}

Catálogo disponible (JSON): ${JSON.stringify(items)}

Outfits ya asignados en otros días (intenta no repetir la misma combinación): ${JSON.stringify(others)}

Espacios del outfit: head (sombrero/gorra), eyes (lentes de sol), top (camisa/polo/blusa), outer (chaqueta/saco), bottom (short/pantalón/falda/traje de baño), dress (vestido/enterizo; si lo usas deja top y bottom vacíos), shoes, accessories (lista).
Responde exactamente con este formato:
{"items":{"head":null,"eyes":null,"top":"id","outer":null,"bottom":"id","dress":null,"shoes":"id","accessories":[]},"explicacion":"por qué esta combinación (máx. 2 frases)","faltantes":"prenda que convendría agregar al catálogo, o vacío"}`;

  const provider = settings.ai_provider;
  const text = await callLLM(provider, settings.ai_key, settings.ai_model || DEFAULT_MODELS[provider], system, user);
  const out = parseJson(text);
  const valid = new Set(items.map((i: any) => i.id));
  const clean: any = { accessories: [] };
  for (const k of ['head', 'eyes', 'top', 'outer', 'bottom', 'dress', 'shoes']) {
    const v = out.items?.[k];
    if (v && valid.has(v)) clean[k] = v;
  }
  for (const a of out.items?.accessories || []) if (valid.has(a)) clean.accessories.push(a);
  return { items: clean, explicacion: out.explicacion || '', faltantes: out.faltantes || '' };
}
