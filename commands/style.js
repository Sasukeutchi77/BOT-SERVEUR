// commands/style.js — J.A.R.V.I.S.
// ✅ 10 styles de texte + design amélioré

import { sendMessage } from "../lib/sendMessage.js"

const styles = {
  1: {
    name: "𝐆𝐫𝐚𝐬 (Bold)",
    map: {
      'a':'𝐚','b':'𝐛','c':'𝐜','d':'𝐝','e':'𝐞','f':'𝐟','g':'𝐠','h':'𝐡',
      'i':'𝐢','j':'𝐣','k':'𝐤','l':'𝐥','m':'𝐦','n':'𝐧','o':'𝐨','p':'𝐩',
      'q':'𝐪','r':'𝐫','s':'𝐬','t':'𝐭','u':'𝐮','v':'𝐯','w':'𝐰','x':'𝐱',
      'y':'𝐲','z':'𝐳',
      'A':'𝐀','B':'𝐁','C':'𝐂','D':'𝐃','E':'𝐄','F':'𝐅','G':'𝐆','H':'𝐇',
      'I':'𝐈','J':'𝐉','K':'𝐊','L':'𝐋','M':'𝐌','N':'𝐍','O':'𝐎','P':'𝐏',
      'Q':'𝐐','R':'𝐑','S':'𝐒','T':'𝐓','U':'𝐔','V':'𝐕','W':'𝐖','X':'𝐗',
      'Y':'𝐘','Z':'𝐙',
      '0':'𝟎','1':'𝟏','2':'𝟐','3':'𝟑','4':'𝟒','5':'𝟓','6':'𝟔','7':'𝟕','8':'𝟖','9':'𝟗'
    }
  },
  2: {
    name: "𝑰𝒕𝒂𝒍𝒊𝒒𝒖𝒆 (Italic)",
    map: {
      'a':'𝑎','b':'𝑏','c':'𝑐','d':'𝑑','e':'𝑒','f':'𝑓','g':'𝑔','h':'ℎ',
      'i':'𝑖','j':'𝑗','k':'𝑘','l':'𝑙','m':'𝑚','n':'𝑛','o':'𝑜','p':'𝑝',
      'q':'𝑞','r':'𝑟','s':'𝑠','t':'𝑡','u':'𝑢','v':'𝑣','w':'𝑤','x':'𝑥',
      'y':'𝑦','z':'𝑧',
      'A':'𝐴','B':'𝐵','C':'𝐶','D':'𝐷','E':'𝐸','F':'𝐹','G':'𝐺','H':'𝐻',
      'I':'𝐼','J':'𝐽','K':'𝐾','L':'𝐿','M':'𝑀','N':'𝑁','O':'𝑂','P':'𝑃',
      'Q':'𝑄','R':'𝑅','S':'𝑆','T':'𝑇','U':'𝑈','V':'𝑉','W':'𝑊','X':'𝑋',
      'Y':'𝑌','Z':'𝑍'
    }
  },
  3: {
    name: "𝑮𝒓𝒂𝒔 𝑰𝒕𝒂𝒍𝒊𝒒𝒖𝒆 (Bold Italic)",
    map: {
      'a':'𝒂','b':'𝒃','c':'𝒄','d':'𝒅','e':'𝒆','f':'𝒇','g':'𝒈','h':'𝒉',
      'i':'𝒊','j':'𝒋','k':'𝒌','l':'𝒍','m':'𝒎','n':'𝒏','o':'𝒐','p':'𝒑',
      'q':'𝒒','r':'𝒓','s':'𝒔','t':'𝒕','u':'𝒖','v':'𝒗','w':'𝒘','x':'𝒙',
      'y':'𝒚','z':'𝒛',
      'A':'𝑨','B':'𝑩','C':'𝑪','D':'𝑫','E':'𝑬','F':'𝑭','G':'𝑮','H':'𝑯',
      'I':'𝑰','J':'𝑱','K':'𝑲','L':'𝑳','M':'𝑴','N':'𝑵','O':'𝑶','P':'𝑷',
      'Q':'𝑸','R':'𝑹','S':'𝑺','T':'𝑻','U':'𝑼','V':'𝑽','W':'𝑾','X':'𝑿',
      'Y':'𝒀','Z':'𝒁'
    }
  },
  4: {
    name: "𝓢𝓬𝓻𝓲𝓹𝓽 (Script)",
    map: {
      'a':'𝓪','b':'𝓫','c':'𝓬','d':'𝓭','e':'𝓮','f':'𝓯','g':'𝓰','h':'𝓱',
      'i':'𝓲','j':'𝓳','k':'𝓴','l':'𝓵','m':'𝓶','n':'𝓷','o':'𝓸','p':'𝓹',
      'q':'𝓺','r':'𝓻','s':'𝓼','t':'𝓽','u':'𝓾','v':'𝓿','w':'𝔀','x':'𝔁',
      'y':'𝔂','z':'𝔃',
      'A':'𝓐','B':'𝓑','C':'𝓒','D':'𝓓','E':'𝓔','F':'𝓕','G':'𝓖','H':'𝓗',
      'I':'𝓘','J':'𝓙','K':'𝓚','L':'𝓛','M':'𝓜','N':'𝓝','O':'𝓞','P':'𝓟',
      'Q':'𝓠','R':'𝓡','S':'𝓢','T':'𝓣','U':'𝓤','V':'𝓥','W':'𝓦','X':'𝓧',
      'Y':'𝓨','Z':'𝓩'
    }
  },
  5: {
    name: "𝔻𝕠𝕦𝕓𝕝𝕖 (Double Struck)",
    map: {
      'a':'𝕒','b':'𝕓','c':'𝕔','d':'𝕕','e':'𝕖','f':'𝕗','g':'𝕘','h':'𝕙',
      'i':'𝕚','j':'𝕛','k':'𝕜','l':'𝕝','m':'𝕞','n':'𝕟','o':'𝕠','p':'𝕡',
      'q':'𝕢','r':'𝕣','s':'𝕤','t':'𝕥','u':'𝕦','v':'𝕧','w':'𝕨','x':'𝕩',
      'y':'𝕪','z':'𝕫',
      'A':'𝔸','B':'𝔹','C':'ℂ','D':'𝔻','E':'𝔼','F':'𝔽','G':'𝔾','H':'ℍ',
      'I':'𝕀','J':'𝕁','K':'𝕂','L':'𝕃','M':'𝕄','N':'ℕ','O':'𝕆','P':'ℙ',
      'Q':'ℚ','R':'ℝ','S':'𝕊','T':'𝕋','U':'𝕌','V':'𝕍','W':'𝕎','X':'𝕏',
      'Y':'𝕐','Z':'ℤ',
      '0':'𝟘','1':'𝟙','2':'𝟚','3':'𝟛','4':'𝟜','5':'𝟝','6':'𝟞','7':'𝟟','8':'𝟠','9':'𝟡'
    }
  },
  6: {
    name: "𝔉𝔯𝔞𝔨𝔱𝔲𝔯 (Fraktur)",
    map: {
      'a':'𝔞','b':'𝔟','c':'𝔠','d':'𝔡','e':'𝔢','f':'𝔣','g':'𝔤','h':'𝔥',
      'i':'𝔦','j':'𝔧','k':'𝔨','l':'𝔩','m':'𝔪','n':'𝔫','o':'𝔬','p':'𝔭',
      'q':'𝔮','r':'𝔯','s':'𝔰','t':'𝔱','u':'𝔲','v':'𝔳','w':'𝔴','x':'𝔵',
      'y':'𝔶','z':'𝔷',
      'A':'𝔄','B':'𝔅','C':'ℭ','D':'𝔇','E':'𝔈','F':'𝔉','G':'𝔊','H':'ℌ',
      'I':'ℑ','J':'𝔍','K':'𝔎','L':'𝔏','M':'𝔐','N':'𝔑','O':'𝔒','P':'𝔓',
      'Q':'𝔔','R':'ℜ','S':'𝔖','T':'𝔗','U':'𝔘','V':'𝔙','W':'𝔚','X':'𝔛',
      'Y':'𝔜','Z':'ℨ'
    }
  },
  7: {
    name: "𝙼𝚘𝚗𝚘 (Monospace)",
    map: {
      'a':'𝚊','b':'𝚋','c':'𝚌','d':'𝚍','e':'𝚎','f':'𝚏','g':'𝚐','h':'𝚑',
      'i':'𝚒','j':'𝚓','k':'𝚔','l':'𝚕','m':'𝚖','n':'𝚗','o':'𝚘','p':'𝚙',
      'q':'𝚚','r':'𝚛','s':'𝚜','t':'𝚝','u':'𝚞','v':'𝚟','w':'𝚠','x':'𝚡',
      'y':'𝚢','z':'𝚣',
      'A':'𝙰','B':'𝙱','C':'𝙲','D':'𝙳','E':'𝙴','F':'𝙵','G':'𝙶','H':'𝙷',
      'I':'𝙸','J':'𝙹','K':'𝙺','L':'𝙻','M':'𝙼','N':'𝙽','O':'𝙾','P':'𝙿',
      'Q':'𝚀','R':'𝚁','S':'𝚂','T':'𝚃','U':'𝚄','V':'𝚅','W':'𝚆','X':'𝚇',
      'Y':'𝚈','Z':'𝚉',
      '0':'𝟶','1':'𝟷','2':'𝟸','3':'𝟹','4':'𝟺','5':'𝟻','6':'𝟼','7':'𝟽','8':'𝟾','9':'𝟿'
    }
  },
  8: {
    name: "ⓑⓤⓑⓑⓛⓔ (Bubble)",
    map: {
      'a':'ⓐ','b':'ⓑ','c':'ⓒ','d':'ⓓ','e':'ⓔ','f':'ⓕ','g':'ⓖ','h':'ⓗ',
      'i':'ⓘ','j':'ⓙ','k':'ⓚ','l':'ⓛ','m':'ⓜ','n':'ⓝ','o':'ⓞ','p':'ⓟ',
      'q':'ⓠ','r':'ⓡ','s':'ⓢ','t':'ⓣ','u':'ⓤ','v':'ⓥ','w':'ⓦ','x':'ⓧ',
      'y':'ⓨ','z':'ⓩ',
      'A':'Ⓐ','B':'Ⓑ','C':'Ⓒ','D':'Ⓓ','E':'Ⓔ','F':'Ⓕ','G':'Ⓖ','H':'Ⓗ',
      'I':'Ⓘ','J':'Ⓙ','K':'Ⓚ','L':'Ⓛ','M':'Ⓜ','N':'Ⓝ','O':'Ⓞ','P':'Ⓟ',
      'Q':'Ⓠ','R':'Ⓡ','S':'Ⓢ','T':'Ⓣ','U':'Ⓤ','V':'Ⓥ','W':'Ⓦ','X':'Ⓧ',
      'Y':'Ⓨ','Z':'Ⓩ',
      '0':'⓪','1':'①','2':'②','3':'③','4':'④','5':'⑤','6':'⑥','7':'⑦','8':'⑧','9':'⑨'
    }
  },
  9: {
    name: "Sᴍᴀʟʟ Cᴀᴘs (Small Caps)",
    map: {
      'a':'ᴀ','b':'ʙ','c':'ᴄ','d':'ᴅ','e':'ᴇ','f':'ғ','g':'ɢ','h':'ʜ',
      'i':'ɪ','j':'ᴊ','k':'ᴋ','l':'ʟ','m':'ᴍ','n':'ɴ','o':'ᴏ','p':'ᴘ',
      'q':'ǫ','r':'ʀ','s':'s','t':'ᴛ','u':'ᴜ','v':'ᴠ','w':'ᴡ','x':'x',
      'y':'ʏ','z':'ᴢ',
      'A':'A','B':'B','C':'C','D':'D','E':'E','F':'F','G':'G','H':'H',
      'I':'I','J':'J','K':'K','L':'L','M':'M','N':'N','O':'O','P':'P',
      'Q':'Q','R':'R','S':'S','T':'T','U':'U','V':'V','W':'W','X':'X',
      'Y':'Y','Z':'Z'
    }
  },
  10: {
    name: "🅂🅀🅄🄰🅁🄴 (Square)",
    map: {
      'a':'🄰','b':'🄱','c':'🄲','d':'🄳','e':'🄴','f':'🄵','g':'🄶','h':'🄷',
      'i':'🄸','j':'🄹','k':'🄺','l':'🄻','m':'🄼','n':'🄽','o':'🄾','p':'🄿',
      'q':'🅀','r':'🅁','s':'🅂','t':'🅃','u':'🅄','v':'🅅','w':'🅆','x':'🅇',
      'y':'🅈','z':'🅉',
      'A':'🄰','B':'🄱','C':'🄲','D':'🄳','E':'🄴','F':'🄵','G':'🄶','H':'🄷',
      'I':'🄸','J':'🄹','K':'🄺','L':'🄻','M':'🄼','N':'🄽','O':'🄾','P':'🄿',
      'Q':'🅀','R':'🅁','S':'🅂','T':'🅃','U':'🅄','V':'🅅','W':'🅆','X':'🅇',
      'Y':'🅈','Z':'🅉'
    }
  }
}

const ALIASES = {
  1: ['bold', 'gras'],
  2: ['italic', 'italique', 'italics'],
  3: ['bolditalic', 'boldit', 'gras-italique', 'grasitalique'],
  4: ['script', 'cursive'],
  5: ['double', 'doublestruck', 'bulle-double'],
  6: ['fraktur', 'gothique', 'gothic'],
  7: ['mono', 'monospace'],
  8: ['bubble', 'bulle'],
  9: ['smallcaps', 'small', 'petitescapitales', 'petites-capitales'],
  10: ['square', 'carre', 'carré']
}

function normalize(str) {
  return str
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '') // enlève les accents
    .replace(/[\s_-]/g, '')
}

function resolveStyleNum(arg) {
  if (!arg) return null
  const cleaned = arg.replace(/[^0-9]/g, '')
  if (cleaned && styles[cleaned]) return cleaned

  if (normalize(arg) === 'random') {
    const nums = Object.keys(styles)
    return nums[Math.floor(Math.random() * nums.length)]
  }

  const norm = normalize(arg)
  for (const [num, names] of Object.entries(ALIASES)) {
    if (names.some(n => normalize(n) === norm)) return num
  }
  return null
}

function getQuotedText(msg) {
  const ctx = msg?.message?.extendedTextMessage?.contextInfo
  const quoted = ctx?.quotedMessage
  if (!quoted) return null
  return (
    quoted.conversation ||
    quoted.extendedTextMessage?.text ||
    null
  )
}

function transformText(text, styleNum) {
  const style = styles[styleNum]
  if (!style) return null
  let result = ""
  for (const char of text) {
    result += style.map[char] || char
  }
  return result
}

export default async function style(sock, sender, args, msg) {
  try {
    const styleArg   = args[0]
    let text         = args.slice(1).join(" ")
    const styleNum   = resolveStyleNum(styleArg)

    // Pas de texte fourni → on tente de récupérer le message cité
    if (styleNum && !text) {
      const quoted = getQuotedText(msg)
      if (quoted) text = quoted
    }

    // ── AIDE — Afficher tous les styles ─────────
    if (!styleNum || !text) {
      let helpText =
        `🕸️┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈🕸️\n` +
        `│   ✨  STYLES DE TEXTE          🕷️\n` +
        `🕸️━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━🕸️\n\n` +
        `🕸️━━━〔 📝 SYNTAXE 〕━━━🕸️\n` +
        `│\n` +
        `│  \`.style <numéro ou nom> <texte>\`\n` +
        `│  \`.style <numéro>\` en réponse à un message\n` +
        `│  \`.style random <texte>\` → style aléatoire\n` +
        `│\n` +
        `│  💡 *Exemples :*\n` +
        `│  \`.style 4 DEMON\` → 𝓓𝓔𝓜𝓞𝓝\n` +
        `│  \`.style gras DEMON\` → 𝐃𝐄𝐌𝐎𝐍\n` +
        `│\n` +
        `🕸️━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━🕸️\n\n` +
        `🕸️━━━〔 🎨 10 STYLES DISPONIBLES 〕━━━🕸️\n` +
        `│\n`

      for (let i = 1; i <= 10; i++) {
        const preview = transformText("DEMON", i.toString())
        const aliasHint = ALIASES[i][0]
        helpText += `│  *${i < 10 ? ' ' : ''}${i}.* ${styles[i].name} _(ou "${aliasHint}")_\n│      → ${preview}\n│\n`
      }

      helpText += `🕸️━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━🕸️`

      return await sendMessage(sock, sender, helpText)
    }

    // ── TRANSFORMER ─────────────────────────────
    const transformed = transformText(text, styleNum)

    if (!transformed) {
      return await sendMessage(sock, sender,
        `🕸️┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈🕸️\n` +
        `│  🕷️ Style *${styleArg}* inconnu.\n` +
        `│  Choisissez entre 1 et 10, ou un nom (gras, italique...).\n` +
        `│  Tapez \`.style\` pour voir tous.\n` +
        `🕸️━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━🕸️`
      )
    }

    // Juste le texte stylé, rien d'autre — répond au message d'origine
    // pour garder le contexte sans ajouter de décoration.
    await sock.sendMessage(sender, { text: transformed }, { quoted: msg })

  } catch (error) {
    console.error("❌ Erreur style:", error)
    await sendMessage(sock, sender, "🕷️ opération échoué lors de la transformation.")
  }
}
