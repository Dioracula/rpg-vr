// js/firebase-config.js

const firebaseConfig = {
    apiKey: "AIzaSyCdsfW1ALz-8ktkYl_rACiY6tu0M2wqkH0",
    authDomain: "rpg-vr-online.firebaseapp.com",
    databaseURL: "https://rpg-vr-online-default-rtdb.firebaseio.com",
    projectId: "rpg-vr-online",
    storageBucket: "rpg-vr-online.firebasestorage.app",
    messagingSenderId: "676174796336",
    appId: "1:676174796336:web:7a91d19a758d29ef247ff5",
};

// Inicializa o Firebase apenas se ainda não estiver inicializado
if (!firebase.apps.length) { 
    firebase.initializeApp(firebaseConfig); 
}

// Exporta as variáveis globais para serem usadas nos outros scripts
window.auth = firebase.auth(); 
window.firestoreDB = firebase.firestore(); 
window.realtimeDB = firebase.database();