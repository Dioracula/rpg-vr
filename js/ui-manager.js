// js/ui-manager.js

window.salvarJogoNuvem = function() { 
    if (!window.currentUser) return; 
    if (window.currentUser.uid && window.currentUser.uid.startsWith('teste_')) return;
    window.firestoreDB.collection("jogadores").doc(window.currentUser.uid).set(window.playerState).catch(e => console.error(e)); 
};

window.fazerLogout = function() {
    window.auth.signOut().then(() => { window.location.reload(); });
};

window.abrirConfiguracoes = function() {
    let aviso = document.querySelector('#texto-central'); 
    if(aviso) { aviso.setAttribute('value', 'Configuracoes em breve...'); aviso.setAttribute('color', '#f1c40f'); aviso.setAttribute('visible', 'true'); setTimeout(() => { if(aviso) aviso.setAttribute('visible', 'false'); }, 2000); }
    window.toggleMenu('sys');
};

window.atualizarArmaVisual = function() { 
    let containerDir = document.querySelector('#arma-visual-dir'); let containerEsq = document.querySelector('#arma-visual-esq'); let containerPC = document.querySelector('#arma-visual-pc'); let escudoPC = document.querySelector('#escudo-visual-pc'); 
    if(!containerDir || !containerEsq || !containerPC || !escudoPC) return; 
    
    containerDir.innerHTML = ''; containerEsq.innerHTML = ''; containerPC.innerHTML = ''; escudoPC.innerHTML = ''; 
    
    let armaStats = window.bancoDeArmas[window.playerState.armaEquipada]; 
    
    if (armaStats && window.playerState.armaEquipada !== 'Shuriken') {
        let htmlArma = '';
        if (armaStats.modeloGlb && armaStats.modeloGlb !== '') { 
            let glbPath = armaStats.modeloGlb.startsWith('#') ? armaStats.modeloGlb : `url(${armaStats.modeloGlb})`;
            htmlArma = `<a-entity gltf-model="${glbPath}" scale="${armaStats.escalaMao || '1 1 1'}" rotation="${armaStats.rotMao || '0 0 0'}" position="${armaStats.posMao || '0 0 0'}" anti-piscar></a-entity>`; 
        } 
        else if (armaStats.visualDir) { htmlArma = armaStats.visualDir; }
        containerDir.innerHTML = htmlArma; containerPC.innerHTML = htmlArma;
    }

    let escudoStats = window.bancoDeArmas[window.playerState.nomeEscudo];
    if (window.playerState.escudoEquipado && escudoStats && (!armaStats || (armaStats.categoria !== 'Arco' && armaStats.categoria !== 'Luva'))) { 
        let htmlEscudo = '';
        if(escudoStats.modeloGlb && escudoStats.modeloGlb !== '') { 
            let glbPath = escudoStats.modeloGlb.startsWith('#') ? escudoStats.modeloGlb : `url(${escudoStats.modeloGlb})`;
            htmlEscudo = `<a-entity gltf-model="${glbPath}" scale="${escudoStats.escalaMao || '1 1 1'}" rotation="${escudoStats.rotMao || '0 0 0'}" position="${escudoStats.posMao || '0 0 0'}" anti-piscar></a-entity>`; 
        } 
        else if (escudoStats.visualEsq) { htmlEscudo = escudoStats.visualEsq; }
        containerEsq.innerHTML = htmlEscudo; escudoPC.innerHTML = htmlEscudo;
    } else if (armaStats && armaStats.categoria === 'Arco') {
        let rot = { rotX: 180, rotY: 90, rotZ: 90 }; 
        let htmlArco = `<a-entity rotation="${rot.rotX} ${rot.rotY} ${rot.rotZ}"><a-torus color="#8B4513" radius="0.3" radius-tubular="0.015" arc="180" rotation="0 0 90"></a-torus><a-cylinder color="#DDDDDD" radius="0.002" height="0.6" rotation="0 0 0"></a-cylinder></a-entity>`;
        containerEsq.innerHTML = htmlArco; escudoPC.innerHTML = htmlArco;
    } else if (armaStats && armaStats.visualEsq && window.playerState.armaEquipada !== 'Shuriken') {
        containerEsq.innerHTML = armaStats.visualEsq;
    }
};

window.tocarSom = function(idSom) {
    let som = document.getElementById(idSom);
    if (som && som.play) { som.currentTime = 0; som.play().catch(e => console.log(e)); }
};

window.atualizarUI = function() { 
    let elsHtml = ['#txt-nivel-hud', '#txt-status-hud', '#hp-wrapper', '#mp-wrapper', '#txt-arma-hud', '#attr-nivel-classe', '#attr-hpmax', '#attr-mpmax', '#attr-atk', '#attr-def', '#attr-agi', '#attr-exp', '#attr-nextexp', '#attr-pts', '#inv-total-ouro', '#tt-flechas', '#tt-shurikens', '#attr-slot-1', '#attr-slot-2']; 
    for(let i=0; i<elsHtml.length; i++) { if(!document.querySelector(elsHtml[i])) return; } 
    
    document.querySelector('#txt-nivel-hud').setAttribute('value', `Nivel: ${window.playerState.nivel} | XP: ${window.playerState.xp}/${window.playerState.xpProxNivel}`); 
    document.querySelector('#txt-status-hud').setAttribute('value', `HP: ${window.playerState.hpAtual}/${window.playerState.hpMax}   |   MP: ${window.playerState.mpAtual}/${window.playerState.mpMax}`); 
    let hpScale = Math.max(0, window.playerState.hpAtual / window.playerState.hpMax); document.querySelector('#hp-wrapper').setAttribute('scale', `${hpScale} 1 1`); 
    let mpScale = Math.max(0, window.playerState.mpAtual / window.playerState.mpMax); document.querySelector('#mp-wrapper').setAttribute('scale', `${mpScale} 1 1`); 
    
    let armaStats = window.bancoDeArmas[window.playerState.armaEquipada]; 
    let escudoStats = window.bancoDeArmas[window.playerState.nomeEscudo];
    
    let strEquip = window.playerState.armaEquipada;
    if(window.playerState.escudoEquipado && window.playerState.nomeEscudo) strEquip += ' + ' + window.playerState.nomeEscudo;
    document.querySelector('#txt-arma-hud').setAttribute('value', `Equipado: ${strEquip}`); 
    
    let forcaTotal = window.playerState.forca + (armaStats ? armaStats.danoBonus : 0); 
    let defesaTotal = window.playerState.defesa + (armaStats ? armaStats.defesaBonus : 0) + (window.playerState.escudoEquipado && escudoStats ? escudoStats.defesaBonus : 0); 
    
    let nomeHeroi = window.playerState.nome || 'Aventureiro';
    let els = { 
        '#attr-nivel-classe': `Lv ${window.playerState.nivel} ${nomeHeroi}`, 
        '#attr-hpmax': window.playerState.hpMax, '#attr-mpmax': window.playerState.mpMax, 
        '#attr-atk': forcaTotal, '#attr-def': defesaTotal, '#attr-agi': window.playerState.velocidade, 
        '#attr-exp': window.playerState.xp, '#attr-nextexp': window.playerState.xpProxNivel, '#attr-pts': window.playerState.pontos, 
        '#inv-total-ouro': window.playerState.ouro, '#tt-flechas': window.playerState.flechas, '#tt-shurikens': window.playerState.shurikens, 
        '#attr-slot-1': window.playerState.armaEquipada 
    }; 
    for(let id in els) { let e = document.querySelector(id); if(e) e.setAttribute('value', els[id]); } 
    
    let elSlot2 = document.querySelector('#attr-slot-2'); 
    if(elSlot2) { 
        if(window.playerState.escudoEquipado && window.playerState.nomeEscudo) elSlot2.setAttribute('value', window.playerState.nomeEscudo.substring(0,8)); 
        else if(armaStats && armaStats.categoria === 'Arco') elSlot2.setAttribute('value', '2 Maos'); 
        else elSlot2.setAttribute('value', 'Vazio'); 
    } 
    window.atualizarArmaVisual(); 
    window.salvarJogoNuvem(); 
};

window.renderizarInventario = function() {
    let listaArmas = Object.keys(window.bancoDeArmas).filter(k => k !== 'Desarmado'); 
    let gridContainer = document.querySelector('#inv-grid-container'); 
    if(!gridContainer) return;
    
    let cols = 7; let startX = -1.05; let startY = 0.55; let gap = 0.28; 
    let htmlSlots = "";
    
    for (let i = 0; i < 35; i++) { 
        let col = i % cols; let row = Math.floor(i / cols); 
        let posX = startX + (col * gap);
        let posY = startY - (row * gap);
        
        htmlSlots += `<a-box class="interativo" position="${posX} ${posY} 0.01" width="0.25" height="0.25" depth="0.01" color="#3a4454" ${i < listaArmas.length ? `slot-interativo="item: ${listaArmas[i]}"` : ''}>
            <a-plane width="0.22" height="0.22" color="#151a21" position="0 0 0.006"></a-plane>`;
        
        if (i < listaArmas.length) { 
            let nomeArma = listaArmas[i]; 
            let armaStats = window.bancoDeArmas[nomeArma]; 
            if(armaStats && armaStats.modeloGlb && armaStats.modeloGlb !== '') { 
                let glbPath = armaStats.modeloGlb.startsWith('#') ? armaStats.modeloGlb : `url(${armaStats.modeloGlb})`;
                htmlSlots += `<a-entity gltf-model="${glbPath}" scale="${armaStats.escalaInv || '0.15 0.15 0.15'}" rotation="${armaStats.rotInv || '0 0 0'}" position="${armaStats.posInv || '0 0 0.05'}"></a-entity>`;
            } else { 
                htmlSlots += `<a-text value="${nomeArma.substring(0,5)}" align="center" width="1" position="0 0 0.02" color="#bdc3c7" scale="0.8 0.8 0.8"></a-text>`;
            } 
        } 
        htmlSlots += `</a-box>`;
    } 
    gridContainer.innerHTML = htmlSlots;
};

window.travarMousePC = function() {
    if (window.GAME_MODE !== 'PC') return;
    let canvas = document.querySelector('.a-canvas');
    if (canvas && document.pointerLockElement !== canvas) canvas.requestPointerLock();
    
    let reticle = document.querySelector('#cursor-centro');
    if (reticle) { reticle.setAttribute('raycaster', 'objects: .interativo; far: 20'); reticle.setAttribute('visible', 'true'); }
    
    let mouseCursor = document.querySelector('#mouse-cursor');
    if (mouseCursor) mouseCursor.setAttribute('raycaster', 'objects: none');
};

window.destravarMousePC = function() {
    if (window.GAME_MODE !== 'PC') return;
    document.exitPointerLock();
    
    let reticle = document.querySelector('#cursor-centro');
    if (reticle) { reticle.setAttribute('raycaster', 'objects: none'); reticle.setAttribute('visible', 'false'); }
    
    let mouseCursor = document.querySelector('#mouse-cursor');
    if (mouseCursor) mouseCursor.setAttribute('raycaster', 'objects: .interativo; far: 20');
};

window.posicionarMenuDeFrente = function(menuId) {
    let menu = document.querySelector(menuId);
    let camera = document.querySelector('[camera]');
    let cena = document.querySelector('a-scene');
    if(!menu || !camera || !cena) return;

    if(menu.parentNode !== cena) { cena.appendChild(menu); }

    let camPos = new THREE.Vector3(); 
    camera.object3D.getWorldPosition(camPos); 
    
    let camQuat = new THREE.Quaternion();
    camera.object3D.getWorldQuaternion(camQuat);
    let camRotY = new THREE.Euler().setFromQuaternion(camQuat, 'YXZ').y;
    
    let distancia = menuId === '#caixa-dialogo' || menuId === '#menu-sistema' ? 1.5 : 1.8; 
    let spawnX = camPos.x - Math.sin(camRotY) * distancia;
    let spawnZ = camPos.z - Math.cos(camRotY) * distancia;

    menu.object3D.position.set(spawnX, camPos.y - 0.2, spawnZ);
    menu.object3D.rotation.set(0, camRotY, 0);
    
    if(menuId === '#caixa-dialogo') menu.setAttribute('scale', '1 1 1');
    else if(menuId === '#menu-sistema') menu.setAttribute('scale', '0.8 0.8 0.8');
    else menu.setAttribute('scale', '0.65 0.65 0.65');
};

window.toggleMenu = function(tipo) {
    let menuInv = document.querySelector('#menu-inventario-novo'); 
    let menuAtrib = document.querySelector('#menu-atributos');
    let menuSys3D = document.querySelector('#menu-sistema'); 
    let menuSys2D = document.querySelector('#sys-ui-layer'); 
    let rig = document.querySelector('#rig');

    if (tipo === 'inv') {
        window.invAberto = !window.invAberto;
        window.atribAberto = false; window.sysMenuAberto = false;
    } else if (tipo === 'atrib') {
        window.atribAberto = !window.atribAberto;
        window.invAberto = false; window.sysMenuAberto = false;
    } else if (tipo === 'sys') {
        window.sysMenuAberto = !window.sysMenuAberto;
        window.invAberto = false; window.atribAberto = false;
    }

    if (menuInv) { menuInv.setAttribute('scale', window.invAberto ? '0.65 0.65 0.65' : '0 0 0'); menuInv.setAttribute('visible', window.invAberto ? 'true' : 'false'); }
    if (menuAtrib) { menuAtrib.setAttribute('scale', window.atribAberto ? '0.65 0.65 0.65' : '0 0 0'); menuAtrib.setAttribute('visible', window.atribAberto ? 'true' : 'false'); }

    if (window.GAME_MODE === 'VR') {
        if (menuSys3D) { menuSys3D.setAttribute('scale', window.sysMenuAberto ? '0.8 0.8 0.8' : '0 0 0'); menuSys3D.setAttribute('visible', window.sysMenuAberto ? 'true' : 'false'); }
        if (menuSys2D) menuSys2D.style.display = 'none';
    } else {
        if (menuSys3D) { menuSys3D.setAttribute('scale', '0 0 0'); menuSys3D.setAttribute('visible', 'false'); }
        if (menuSys2D) menuSys2D.style.display = window.sysMenuAberto ? 'flex' : 'none';
    }

    if (window.invAberto || window.atribAberto || window.sysMenuAberto) {
        if (window.invAberto) window.posicionarMenuDeFrente('#menu-inventario-novo');
        if (window.atribAberto) window.posicionarMenuDeFrente('#menu-atributos');
        if (window.sysMenuAberto && window.GAME_MODE === 'VR') window.posicionarMenuDeFrente('#menu-sistema');
        
        window.destravarMousePC();
        if (rig) rig.setAttribute('movement-controls', 'enabled', 'false');
    } else {
        if(!window.npcAtivo) {
            window.travarMousePC();
            if (rig) rig.setAttribute('movement-controls', 'enabled', 'true');
        }
    }
    window.atualizarUI();
};

window.abrirDialogoNPC = function(data) {
    window.npcAtivo = data;
    let cx = document.querySelector('#caixa-dialogo'); let tNome = document.querySelector('#npc-nome-ui'); let tTexto = document.querySelector('#npc-texto-ui'); let entRec = document.querySelector('#npc-recompensa-ui'); let tRec = document.querySelector('#npc-rec-texto'); let btnAceitar = document.querySelector('#btn-npc-aceitar');
    if(!cx || !tNome || !tTexto) return;

    tNome.setAttribute('value', data.nome || "NPC");
    let jaConcluiu = data.chaveConclusao && window.playerState.chaves[data.chaveConclusao]; let podeFazer = !data.requisito || window.playerState.chaves[data.requisito];

    if (data.tipo === 'dialogo' || jaConcluiu) {
        tTexto.setAttribute('value', data.dialogoPadrao || "Olá aventureiro.");
        entRec.setAttribute('visible', 'false'); btnAceitar.setAttribute('visible', 'false');
    } else if ((data.tipo === 'secundaria' || data.tipo === 'primaria') && podeFazer) {
        tTexto.setAttribute('value', data.dialogoMissao || "Preciso de ajuda com esta missão!");
        let recStr = ""; 
        if (data.recXP && data.recXP > 0) recStr += `+${data.recXP} XP   `; 
        if (data.recOuro && data.recOuro > 0) recStr += `+${data.recOuro} Ouro   `; 
        if (data.recItem && data.recItem !== "") recStr += `Item: ${data.recItem}`;
        
        if (recStr.trim() !== "") { tRec.setAttribute('value', recStr); entRec.setAttribute('visible', 'true'); } 
        else { entRec.setAttribute('visible', 'false'); }
        btnAceitar.setAttribute('visible', 'true'); 
    } else {
        tTexto.setAttribute('value', "Você ainda não tem os requisitos para falar comigo.");
        entRec.setAttribute('visible', 'false'); btnAceitar.setAttribute('visible', 'false'); 
    }
    
    window.posicionarMenuDeFrente('#caixa-dialogo');
    cx.setAttribute('visible', 'true');
    window.destravarMousePC(); 
    
    let rig = document.querySelector('#rig');
    if (rig) rig.setAttribute('movement-controls', 'enabled', 'false');
};

window.fecharDialogoNPC = function() {
    let cx = document.querySelector('#caixa-dialogo'); 
    if(cx) { cx.setAttribute('scale', '0 0 0'); cx.setAttribute('visible', 'false'); }
    window.npcAtivo = null;
    if (!window.invAberto && !window.atribAberto && !window.sysMenuAberto) {
        window.travarMousePC();
        let rig = document.querySelector('#rig');
        if (rig) rig.setAttribute('movement-controls', 'enabled', 'true');
    }
};

window.aceitarMissaoNPC = function() {
    let data = window.npcAtivo; if (!data) return;
    if (data.chaveConclusao) { window.playerState.chaves[data.chaveConclusao] = true; }
    if (data.recXP) window.playerState.xp += Number(data.recXP);
    if (data.recOuro) window.playerState.ouro += Number(data.recOuro);
    if (data.recItem && window.bancoDeArmas[data.recItem]) { window.playerState.armaEquipada = data.recItem; }
    
    if (window.playerState.xp >= window.playerState.xpProxNivel) { 
        window.playerState.nivel++; window.playerState.pontos += 3; window.playerState.xp -= window.playerState.xpProxNivel; window.playerState.xpProxNivel = Math.floor(window.playerState.xpProxNivel * 1.5); 
    }
    
    window.atualizarUI(); window.salvarJogoNuvem(); window.tocarSom('snd-magic');
    let aviso = document.querySelector('#texto-central'); 
    if(aviso) { aviso.setAttribute('value', 'MISSÃO CONCLUÍDA!'); aviso.setAttribute('color', '#f1c40f'); aviso.setAttribute('visible', 'true'); setTimeout(() => aviso.setAttribute('visible', 'false'), 3000); }
    window.fecharDialogoNPC();
};

window.iniciarTelaSelecaoModo = function() { 
    document.getElementById('login-menu').style.display = 'none'; 
    
    if (window.currentUser && window.currentUser.uid && !window.currentUser.uid.startsWith('teste_')) { 
        window.firestoreDB.collection("jogadores").doc(window.currentUser.uid).get().then((doc) => { 
            if (doc.exists && doc.data().personagemCriado) { 
                window.playerState = Object.assign(window.playerState, doc.data()); 
                if(window.playerState.hpAtual <= 0) { window.playerState.hpAtual = window.playerState.hpMax; window.playerState.vivo = true; }
                document.getElementById('start-menu').style.display = 'block'; 
            } else {
                window.location.href = 'create.html';
            }
        }).catch(e => console.error("Erro ao carregar save", e)); 
    } else {
        document.getElementById('start-menu').style.display = 'block'; 
    }
};

window.iniciarJogo = function(modo) { 
    window.GAME_MODE = modo; window.GAME_STARTED = true; 
    document.getElementById('ui-layer').style.display = 'none'; 
    document.body.classList.remove('menu-aberto');
    
    window.playerState.invulneravel = true; setTimeout(() => { window.playerState.invulneravel = false; }, 3000);

    let maoEsq = document.querySelector('#mao-esquerda'); let maoDir = document.querySelector('#mao-direita');
    let cursor = document.querySelector('#cursor-centro'); let wpPc = document.querySelector('#arma-visual-pc'); let scPc = document.querySelector('#escudo-visual-pc');
    let cam = document.querySelector('[camera]'); let rig = document.querySelector('#rig');

    if(rig) {
        let r = window.playerState.ultimoRespawn;
        if(r) rig.setAttribute('position', `${r.x} ${r.y} ${r.z}`);
    }

    window.renderizarInventario(); 

    if (modo === 'PC') { 
        if(maoEsq) { maoEsq.setAttribute('visible', 'false'); maoEsq.setAttribute('raycaster', 'far', 0); }
        if(maoDir) { maoDir.setAttribute('visible', 'false'); maoDir.setAttribute('raycaster', 'far', 0); }
        document.getElementById('crosshair').style.display = 'block';
        document.getElementById('pc-ui').style.display = 'block'; 
        setTimeout(() => { window.travarMousePC(); }, 100); 
        
    } else if (modo === 'ANDROID') {
        if(maoEsq) { maoEsq.setAttribute('visible', 'false'); maoEsq.setAttribute('raycaster', 'far', 0); }
        if(maoDir) { maoDir.setAttribute('visible', 'false'); maoDir.setAttribute('raycaster', 'far', 0); }
        
        if(cam) { cam.removeAttribute('look-controls'); } 
        if(rig) { rig.removeAttribute('movement-controls'); } 
        
        document.getElementById('mobile-ui').style.display = 'block'; 
        let elem = document.documentElement; if (elem.requestFullscreen) { elem.requestFullscreen(); } else if (elem.webkitRequestFullscreen) { elem.webkitRequestFullscreen(); }
        if (screen.orientation && screen.orientation.lock) { screen.orientation.lock('landscape').catch(e => console.log(e)); }
        
    } else { 
        if(cursor) { cursor.setAttribute('visible', 'false'); cursor.setAttribute('raycaster', 'far', 0); }
        if(wpPc) wpPc.setAttribute('visible', 'false'); if(scPc) scPc.setAttribute('visible', 'false'); 
        document.querySelector('a-scene').enterVR(); 
    } 
    window.atualizarUI(); 
};

// Listeners de UI (Login, Botões, Joystick)
document.addEventListener('DOMContentLoaded', () => { 
    document.body.classList.add('menu-aberto');
    ['mousedown', 'keydown', 'touchstart'].forEach(e => window.addEventListener(e, () => window.lastActionTime = Date.now()));
    
    function mostrarErroLogin(msg) {
        let errBox = document.getElementById('login-error');
        if (errBox) { errBox.style.display = 'block'; errBox.innerText = msg; }
    }

    // Usando o "?." (Optional Chaining) para evitar erro se o botão não existir na tela
    document.getElementById('btn-registrar')?.addEventListener('click', function(e) { 
        e.preventDefault(); let btn = document.getElementById('btn-registrar'); let errBox = document.getElementById('login-error');
        let email = document.getElementById('login-email').value; let senha = document.getElementById('login-senha').value; 
        if(!email || !senha) { mostrarErroLogin("⚠️ Preencha e-mail e senha!"); return; }
        btn.innerText = "Processando..."; if(errBox) errBox.style.display = 'none'; 
        window.auth.createUserWithEmailAndPassword(email, senha).then((userCredential) => { window.currentUser = userCredential.user; window.iniciarTelaSelecaoModo(); }).catch((error) => { btn.innerText = "Criar Conta"; mostrarErroLogin("Erro: " + error.message); }); 
    }); 
    
    document.getElementById('btn-login')?.addEventListener('click', function(e) { 
        e.preventDefault(); let btn = document.getElementById('btn-login'); let errBox = document.getElementById('login-error');
        let email = document.getElementById('login-email').value; let senha = document.getElementById('login-senha').value; 
        if(!email || !senha) { mostrarErroLogin("⚠️ Preencha e-mail e senha!"); return; }
        btn.innerText = "Conectando..."; if(errBox) errBox.style.display = 'none'; 
        window.auth.signInWithEmailAndPassword(email, senha).then((userCredential) => { window.currentUser = userCredential.user; window.iniciarTelaSelecaoModo(); }).catch((error) => { btn.innerText = "Entrar"; mostrarErroLogin("Erro: " + error.message); }); 
    }); 

    window.auth.onAuthStateChanged((user) => {
        if (user) { window.currentUser = user; window.iniciarTelaSelecaoModo(); }
    });
    
    window.realtimeDB.ref('server_config/modoTeste').on('value', snap => {
        let ativo = snap.val() || false; let btnTeste = document.getElementById('btn-login-teste');
        if (btnTeste) { btnTeste.style.display = ativo ? 'block' : 'none'; }
    });

    document.getElementById('btn-login-teste')?.addEventListener('click', function(e) {
        e.preventDefault(); let errBox = document.getElementById('login-error'); if(errBox) errBox.style.display = 'none';
        let fakeId = 'teste_' + Math.random().toString(36).substr(2, 5);
        window.currentUser = { uid: fakeId, email: fakeId + '@teste.com' };
        window.iniciarTelaSelecaoModo();
    });
    
    document.getElementById('btn-pc')?.addEventListener('click', () => { window.iniciarJogo('PC'); }); 
    document.getElementById('btn-vr')?.addEventListener('click', () => { window.iniciarJogo('VR'); }); 
    document.getElementById('btn-android')?.addEventListener('click', () => { window.iniciarJogo('ANDROID'); }); 

    document.getElementById('btn-sys-pc')?.addEventListener('click', () => { window.toggleMenu('sys'); });
    document.getElementById('btn-sys-mobile')?.addEventListener('touchstart', (e) => { e.preventDefault(); e.stopPropagation(); window.lastActionTime = Date.now(); window.toggleMenu('sys'); }, {passive: false});

    let podeAtacarMobile = true;
    document.getElementById('btn-inv')?.addEventListener('touchstart', (e) => { e.preventDefault(); e.stopPropagation(); window.lastActionTime = Date.now(); window.toggleMenu('inv'); }, {passive: false});
    document.getElementById('btn-status')?.addEventListener('touchstart', (e) => { e.preventDefault(); e.stopPropagation(); window.lastActionTime = Date.now(); window.toggleMenu('atrib'); }, {passive: false});
    
    document.getElementById('btn-escudo')?.addEventListener('touchstart', (e) => { 
        e.preventDefault(); e.stopPropagation(); window.lastActionTime = Date.now(); 
        let armaAtual = window.bancoDeArmas[window.playerState.armaEquipada];
        if (!window.playerState.escudoEquipado && armaAtual && (armaAtual.categoria === 'Arco' || armaAtual.categoria === 'Luva')) {
            let aviso = document.querySelector('#texto-central'); 
            if(aviso) { aviso.setAttribute('value', 'NÃO PODE USAR ESCUDO\nCOM ARMA DE 2 MÃOS!'); aviso.setAttribute('color', '#FF0000'); aviso.setAttribute('visible', 'true'); setTimeout(() => { if(aviso) aviso.setAttribute('visible', 'false'); }, 2000); }
            return;
        }
        window.playerState.escudoEquipado = !window.playerState.escudoEquipado; window.atualizarUI(); 
        let msg = window.playerState.escudoEquipado ? 'Escudo Equipado!' : 'Escudo Guardado!'; 
        let aviso = document.querySelector('#texto-central'); 
        if(aviso) { aviso.setAttribute('value', msg); aviso.setAttribute('color', window.playerState.escudoEquipado ? '#4169E1' : '#FF4500'); aviso.setAttribute('visible', 'true'); setTimeout(() => { if(aviso) aviso.setAttribute('visible', 'false'); }, 1500); } 
    }, {passive: false});
    
    document.getElementById('btn-atacar')?.addEventListener('touchstart', (e) => { e.preventDefault(); e.stopPropagation(); window.lastActionTime = Date.now(); if (!podeAtacarMobile) return; podeAtacarMobile = false; setTimeout(() => podeAtacarMobile = true, 800); window.realizarAtaque(); }, {passive: false});

    // Joystick Mobile (Protegido por if)
    const zone = document.getElementById('joystick-zone'); 
    const stick = document.getElementById('joystick-stick');
    
    if (zone && stick) {
        let isDraggingJoy = false; let joyTouchId = null; let centerX, centerY, maxRadius = 40;
        
        zone.addEventListener('touchstart', (e) => { e.preventDefault(); e.stopPropagation(); if(isDraggingJoy) return; isDraggingJoy = true; let touch = e.changedTouches[0]; joyTouchId = touch.identifier; let rect = zone.getBoundingClientRect(); centerX = rect.left + rect.width / 2; centerY = rect.top + rect.height / 2; handleTouch(touch); }, {passive: false});
        zone.addEventListener('touchmove', (e) => { e.preventDefault(); e.stopPropagation(); if(isDraggingJoy) { for(let i=0; i<e.touches.length; i++) { if(e.touches[i].identifier === joyTouchId) { handleTouch(e.touches[i]); break; } } } }, {passive: false});
        const releaseJoystick = (e) => { if(e) { let found = false; for(let i=0; i<e.changedTouches.length; i++) { if(e.changedTouches[i].identifier === joyTouchId) { found = true; break; } } if(!found) return; } isDraggingJoy = false; joyTouchId = null; stick.style.transform = `translate(0px, 0px)`; window.joystickVector = { x: 0, y: 0 }; };
        zone.addEventListener('touchend', releaseJoystick, {passive: false}); zone.addEventListener('touchcancel', releaseJoystick, {passive: false});
        
        function handleTouch(touch) { window.lastActionTime = Date.now(); let dx = touch.clientX - centerX; let dy = touch.clientY - centerY; let distance = Math.sqrt(dx*dx + dy*dy); if (distance > maxRadius) { dx = (dx / distance) * maxRadius; dy = (dy / distance) * maxRadius; } stick.style.transform = `translate(${dx}px, ${dy}px)`; window.joystickVector.x = dx / maxRadius; window.joystickVector.y = dy / maxRadius; }
    }

    // Sistema AFK e Kick
    setInterval(() => {
        if (window.GAME_STARTED && window.playerState.vivo) {
            if (Date.now() - window.lastActionTime > 900000) { 
                window.GAME_STARTED = false; let mpComp = document.querySelector('[firebase-multiplayer]'); if(mpComp && mpComp.components['firebase-multiplayer'] && mpComp.components['firebase-multiplayer'].myRef) { mpComp.components['firebase-multiplayer'].myRef.remove(); }
                let aviso = document.querySelector('#texto-central'); if(aviso) { aviso.setAttribute('value', 'DESCONECTADO:\n15 MIN INATIVO (AFK)'); aviso.setAttribute('color', '#ff0000'); aviso.setAttribute('visible', 'true'); } setTimeout(() => location.reload(), 4000);
            }
        }
    }, 5000);

    window.realtimeDB.ref('server_commands/kick_all').on('value', snap => {
        if(snap.val() && window.GAME_STARTED) { window.GAME_STARTED = false; let aviso = document.querySelector('#texto-central'); if(aviso) { aviso.setAttribute('value', 'KICKADO PELO ADMIN!'); aviso.setAttribute('color', '#ff0000'); aviso.setAttribute('visible', 'true'); } setTimeout(() => location.reload(), 3000); }
    });
    
    // Escuta mudanças de armas do Admin
    window.realtimeDB.ref('banco_armas').on('value', snap => {
        let dados = snap.val();
        if(dados) { window.bancoDeArmas = Object.assign(window.bancoDeArmas, dados); }
        if(window.renderizarInventario) window.renderizarInventario();
        if(window.GAME_STARTED) window.atualizarUI();
    });
});
