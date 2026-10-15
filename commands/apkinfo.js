import { downloadContentFromMessage } from '@whiskeysockets/baileys'
import zlib from 'zlib'
import { sendMessage } from '../lib/sendMessage.js'
import { downloadQuotedMediaBuffer } from '../lib/media.js'

function readZipEntry(buffer, targetName) {
  let eocd = -1
  for (let i = buffer.length - 22; i >= Math.max(0, buffer.length - 65557); i--) {
    if (buffer.readUInt32LE(i) === 0x06054b50) {
      eocd = i
      break
    }
  }
  if (eocd < 0) throw new Error('Archive APK invalide')

  const entries = buffer.readUInt16LE(eocd + 10)
  let off = buffer.readUInt32LE(eocd + 16)

  for (let i = 0; i < entries; i++) {
    if (buffer.readUInt32LE(off) !== 0x02014b50) throw new Error('Table ZIP invalide')

    const method = buffer.readUInt16LE(off + 10)
    const compSize = buffer.readUInt32LE(off + 20)
    const nameLen = buffer.readUInt16LE(off + 28)
    const extraLen = buffer.readUInt16LE(off + 30)
    const commentLen = buffer.readUInt16LE(off + 32)
    const localOffset = buffer.readUInt32LE(off + 42)
    const name = buffer.subarray(off + 46, off + 46 + nameLen).toString('utf8')

    if (name === targetName) {
      const localNameLen = buffer.readUInt16LE(localOffset + 26)
      const localExtraLen = buffer.readUInt16LE(localOffset + 28)
      const dataStart = localOffset + 30 + localNameLen + localExtraLen
      const data = buffer.subarray(dataStart, dataStart + compSize)
      if (method === 0) return data
      if (method === 8) return zlib.inflateRawSync(data)
      throw new Error(`Compression APK non supportée: ${method}`)
    }

    off += 46 + nameLen + extraLen + commentLen
  }

  throw new Error('AndroidManifest.xml introuvable')
}

function readLength8(buffer, offset) {
  const first = buffer[offset]
  if ((first & 0x80) === 0) return { value: first, bytes: 1 }
  return { value: ((first & 0x7f) << 8) | buffer[offset + 1], bytes: 2 }
}

function readLength16(buffer, offset) {
  const first = buffer.readUInt16LE(offset)
  if ((first & 0x8000) === 0) return { value: first, bytes: 2 }
  return { value: ((first & 0x7fff) << 16) | buffer.readUInt16LE(offset + 2), bytes: 4 }
}

function parseStringPool(buffer, offset) {
  const headerSize = buffer.readUInt16LE(offset + 2)
  const stringCount = buffer.readUInt32LE(offset + 8)
  const flags = buffer.readUInt32LE(offset + 16)
  const stringsStart = buffer.readUInt32LE(offset + 20)
  const isUtf8 = (flags & 0x100) !== 0
  const offsets = []

  for (let i = 0; i < stringCount; i++) {
    offsets.push(buffer.readUInt32LE(offset + headerSize + i * 4))
  }

  return offsets.map(itemOffset => {
    let pos = offset + stringsStart + itemOffset
    if (isUtf8) {
      const utf16 = readLength8(buffer, pos)
      pos += utf16.bytes
      const utf8 = readLength8(buffer, pos)
      pos += utf8.bytes
      return buffer.subarray(pos, pos + utf8.value).toString('utf8')
    }

    const len = readLength16(buffer, pos)
    pos += len.bytes
    return buffer.subarray(pos, pos + len.value * 2).toString('utf16le')
  })
}

function valueToText(strings, rawValue, type, data) {
  if (rawValue !== 0xffffffff && strings[rawValue]) return strings[rawValue]
  if (type === 0x03) return strings[data] || ''
  if (type === 0x10 || type === 0x11) return String(data)
  if (type === 0x12) return data ? 'true' : 'false'
  if (type === 0x01) return `@0x${data.toString(16)}`
  return String(data)
}

function parseManifest(buffer) {
  let offset = 8
  let strings = []
  const manifest = { packageName: 'Inconnu', versionName: 'Inconnue', minSdk: 'Inconnu', permissions: [] }

  while (offset < buffer.length) {
    const type = buffer.readUInt16LE(offset)
    const headerSize = buffer.readUInt16LE(offset + 2)
    const size = buffer.readUInt32LE(offset + 4)

    if (type === 0x0001) {
      strings = parseStringPool(buffer, offset)
    } else if (type === 0x0102) {
      const tagName = strings[buffer.readUInt32LE(offset + 20)] || ''
      const attrCount = buffer.readUInt16LE(offset + 28)
      const attrs = {}
      const attrBase = offset + headerSize + 20

      for (let i = 0; i < attrCount; i++) {
        const attrOffset = attrBase + i * 20
        const name = strings[buffer.readUInt32LE(attrOffset + 4)] || ''
        const rawValue = buffer.readUInt32LE(attrOffset + 8)
        const typeValue = buffer[attrOffset + 15]
        const data = buffer.readUInt32LE(attrOffset + 16)
        attrs[name] = valueToText(strings, rawValue, typeValue, data)
      }

      if (tagName === 'manifest') {
        manifest.packageName = attrs.package || manifest.packageName
        manifest.versionName = attrs.versionName || manifest.versionName
      }

      if (tagName === 'uses-sdk') {
        manifest.minSdk = attrs.minSdkVersion || manifest.minSdk
      }

      if (tagName === 'uses-permission' || tagName === 'uses-permission-sdk-23') {
        const permission = attrs.name
        if (permission && !manifest.permissions.includes(permission)) manifest.permissions.push(permission)
      }
    }

    if (!size) break
    offset += size
  }

  return manifest
}

async function getDirectDocumentBuffer(msg) {
  const doc = msg?.message?.documentMessage
  if (!doc) return null
  const stream = await downloadContentFromMessage(doc, 'document')
  const chunks = []
  for await (const chunk of stream) chunks.push(chunk)
  return { buffer: Buffer.concat(chunks), fileName: doc.fileName || 'application.apk' }
}

export default async function apkinfo(sock, sender, args, msg) {
  try {
    let result = await getDirectDocumentBuffer(msg)

    if (!result) {
      const quoted = await downloadQuotedMediaBuffer(sock, msg)
      if (!quoted.ok || quoted.kind !== 'document') {
        return await sendMessage(sock, sender,
          `🕸️━━━〔 📦 𝐀𝐏𝐊 𝐈𝐍𝐅𝐎 〕━━━🕸️\n` +
          `│ Réponds à un fichier APK avec *.apkinfo*\n` +
          `│ Ou envoie l'APK avec *.apkinfo* en légende.\n` +
          `🕸️━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━🕸️`
        )
      }
      result = { buffer: quoted.buffer, fileName: quoted.unwrapped?.documentMessage?.fileName || 'application.apk' }
    }

    if (!result.fileName.toLowerCase().endsWith('.apk')) {
      return await sendMessage(sock, sender, '🕷️ Le fichier doit être un APK (.apk).')
    }

    const manifestBuffer = readZipEntry(result.buffer, 'AndroidManifest.xml')
    const info = parseManifest(manifestBuffer)
    const permissions = info.permissions.length
      ? info.permissions.slice(0, 30).map(p => `│ • ${p}`).join('\n')
      : '🕷️ Aucune permission déclarée'
    const extra = info.permissions.length > 30 ? `\n│ … +${info.permissions.length - 30} autres permissions` : ''

    await sendMessage(sock, sender,
      `🕸️━━━〔 📦 𝐀𝐏𝐊 𝐀𝐍𝐀𝐋𝐘𝐒É 〕━━━🕸️\n` +
      `│ Fichier: ${result.fileName}\n` +
      `│ Package: ${info.packageName}\n` +
      `│ Version: ${info.versionName}\n` +
      `│ API minimum: ${info.minSdk}\n` +
      `│ Permissions: ${info.permissions.length}\n` +
      `├──────────────────────\n` +
      `${permissions}${extra}\n` +
      `🕸️━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━🕸️`
    )
  } catch (error) {
    await sendMessage(sock, sender, `│ Analyse APK impossible: ${error.message}`)
  }
}