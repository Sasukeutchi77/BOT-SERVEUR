// lib/antiSuppressionManager.js — VERSION ULTRA STABLE v1

import fs from "fs"
import path from "path"
import { fileURLToPath } from "url"

const __filename = fileURLToPath(import.meta.url)
const __dirname  = path.dirname(__filename)

const DATA_FILE = path.join(__dirname,"../data/antisuppression.json")

//────────────────────────────
// CONFIG
//────────────────────────────

const CACHE_TTL = 5 * 60 * 1000
const CACHE_MAX = 2000

//────────────────────────────
// CACHE
//────────────────────────────

const MSG_CACHE = new Map()

//────────────────────────────
// DATABASE (CACHE MEMOIRE)
//────────────────────────────

let groupsCache = []

function loadDB(){

    try{

        if(fs.existsSync(DATA_FILE)){

            const data = JSON.parse(fs.readFileSync(DATA_FILE))

            groupsCache = data.groups || []

        }

    }catch{

        groupsCache = []

    }

}

function saveDB(){

    try{

        const dir = path.dirname(DATA_FILE)

        if(!fs.existsSync(dir)){
            fs.mkdirSync(dir,{recursive:true})
        }

        fs.writeFileSync(DATA_FILE,
            JSON.stringify({groups:groupsCache},null,2)
        )

    }catch{}

}

loadDB()

//────────────────────────────
// API
//────────────────────────────

export function isAntiSuppressionEnabled(groupId){

    return groupsCache.includes(groupId)

}

export function setAntiSuppression(groupId,enable){

    if(enable){

        if(!groupsCache.includes(groupId)){
            groupsCache.push(groupId)
        }

    }else{

        groupsCache = groupsCache.filter(g=>g!==groupId)

    }

    saveDB()

}

//────────────────────────────
// MESSAGE UTIL
//────────────────────────────

function extractText(msg){

    const m = msg?.message || {}

    return (
        m.conversation ||
        m.extendedTextMessage?.text ||
        m.imageMessage?.caption ||
        m.videoMessage?.caption ||
        m.documentMessage?.caption ||
        ""
    )

}

function getType(msg){

    const m = msg?.message || {}

    if(m.imageMessage) return "image"
    if(m.videoMessage) return "video"
    if(m.audioMessage) return "audio"
    if(m.documentMessage) return "document"
    if(m.stickerMessage) return "sticker"

    return "text"

}

//────────────────────────────
// CACHE MESSAGE
//────────────────────────────

export function cacheMessage(msg){

    const id = msg?.key?.id

    if(!id) return

    const now = Date.now()

    // nettoyer anciens messages

    for(const [k,v] of MSG_CACHE){

        if(now - v.timestamp > CACHE_TTL){
            MSG_CACHE.delete(k)
        }

    }

    // limiter taille cache

    if(MSG_CACHE.size > CACHE_MAX){

        const firstKey = MSG_CACHE.keys().next().value

        MSG_CACHE.delete(firstKey)

    }

    MSG_CACHE.set(id,{

        sender : msg.key.participant || msg.key.remoteJid,
        text   : extractText(msg),
        type   : getType(msg),
        msg    : msg.message,
        pushName : msg.pushName || "",
        timestamp : now

    })

}

//────────────────────────────
// GET MESSAGE
//────────────────────────────

export function getCachedMessage(id){

    return MSG_CACHE.get(id) || null

}

export function removeCachedMessage(id){

    MSG_CACHE.delete(id)

}

//────────────────────────────
// AUTO CLEAN
//────────────────────────────

setInterval(()=>{

    const now = Date.now()

    for(const [k,v] of MSG_CACHE){

        if(now - v.timestamp > CACHE_TTL){
            MSG_CACHE.delete(k)
        }

    }

},60000)