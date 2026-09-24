/* =====================================
   functions/index.js — PUSH REAL (app fechado)
   Toda vez que entra um item em musical/notificacoes
   no Realtime Database, envia notificação push para
   todos os dispositivos que têm token FCM salvo em
   musical/tokens.
   ===================================== */

const functions = require('firebase-functions');
const admin = require('firebase-admin');

admin.initializeApp();

exports.enviarNotificacao = functions.database
    .ref('/musical/notificacoes/{id}')
    .onCreate(async (snap) => {
        const n = snap.val() || {};
        const titulo = n.titulo || 'Nova notificação';
        const corpo = n.desc || '';

        const tokensSnap = await admin.database().ref('musical/tokens').once('value');
        const mapa = tokensSnap.val() || {};
        const tokens = Object.values(mapa)
            .map(function (t) { return t && t.token; })
            .filter(Boolean);

        if (!tokens.length) {
            console.log('[push] Nenhum dispositivo com token FCM nasceu ainda.');
            return null;
        }

        const resp = await admin.messaging().sendToDevice(tokens, {
            notification: {
                title: titulo,
                body: corpo,
                icon: 'assets/icon.png'
            }
        });

        console.log('[push] Enviado para', tokens.length, 'dispositivo(s).', JSON.stringify(resp));
        return resp;
    });