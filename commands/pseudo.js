import { sendMessage } from "../lib/sendMessage.js"

export default async function pseudo(sock, sender, args, msg) {
    try {
        // Vérifier si un nom est fourni
        const newName = args.join(' ').trim()
        
        if (!newName) {
            return await sendMessage(sock, sender, 
                "🕷️ *syntaxe incorrect*\n\n" +
                "📌 Exemple: `.pseudo Sasuke`\n" +
                "📌 Exemple: `.pseudo Roi du serveur`"
            )
        }
        
        // Vérifier la longueur (WhatsApp limite à 25 caractères généralement)
        if (newName.length > 25) {
            return await sendMessage(sock, sender, 
                "⚠️ *Nom trop long*\n" +
                "📏 Maximum 25 caractères autorisés."
            )
        }
        
        // Vérifier caractères interdits
        const forbiddenChars = /[<>\"\\]/
        if (forbiddenChars.test(newName)) {
            return await sendMessage(sock, sender, 
                "⚠️ *Caractères interdits*\n" +
                "🕷️ Les caractères < > \" \\ ne sont pas autorisés."
            )
        }
        
        // Changer le nom de profil
        await sock.updateProfileName(newName)
        
        // Confirmation stylisée
        await sendMessage(sock, sender, 
            "⚙️ *Nom changé avec succès !*\n\n" +
            `👤 Nouveau nom: *${newName}*\n` +
            `🕐 ${new Date().toLocaleTimeString('fr-FR')}`
        )
        
        console.log(`📝 Profil mis à jour: "${newName}" par ${sender.split('@')[0]}`)
        
    } catch (error) {
        console.error("❌ Erreur pseudo:", error)
        
        // Gestion erreurs spécifiques
        if (error.message?.includes('rate-limit')) {
            await sendMessage(sock, sender, 
                "⏳ *Trop de changements*\n" +
                "Attends quelques minutes avant de réessayer."
            )
        } else if (error.message?.includes('not-authorized')) {
            await sendMessage(sock, sender, 
                "🔒 *Permission refusée*\n" +
                "Le bot n'a pas les droits pour changer le nom."
            )
        } else {
            await sendMessage(sock, sender, 
                "🕷️ *opération échoué*\n" + 
                `${error.message || "Impossible de changer le nom"}`
            )
        }
    }
}
