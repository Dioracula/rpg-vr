// ==========================================
// FUNÇÕES PRINCIPAIS E LÓGICA DE INTERFACE
// ==========================================

window.comboAtaque = 0; 

window.salvarJogoNuvem = function() { 
    if (!window.currentUser) return; 
    if (window.currentUser.uid && window.currentUser.uid.startsWith('teste_')) return;
    firestoreDB.collection("jogadores").doc(window.currentUser.uid).set(window.playerState).catch(e => console.error(e)); 
};

window.fazerLogout = function() {
    firebase.auth().signOut().then(() => { window.location.reload(); });
};

window.abrirConfiguracoes = function() {
    let aviso = document.querySelector('#texto-central'); 
    if(aviso) { aviso.setAttribute('value', 'Configuracoes em breve...'); aviso.setAttribute('color', '#f1c40f'); aviso.setAttribute('visible', 'true'); setTimeout(() => { if(aviso) aviso.setAttribute('visible', 'false'); }, 2000); }
    window.toggleMenu('sys');
};

window.tocarSom = function(idSom) {
    let som = document.getElementById(idSom);
    if (som && som.play) { som.currentTime = 0; som.play().catch(e => console.log(e)); }
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
        escudoPC.innerHTML = armaStats.visualEsq;
    }
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
    let menu = document.querySelector(menuId); let camera = document.querySelector('[camera]'); let cena = document.querySelector('a-scene');
    if(!menu || !camera || !cena) return;
    if(menu.parentNode !== cena) { cena.appendChild(menu); }

    let camPos = new THREE.Vector3(); camera.object3D.getWorldPosition(camPos); 
    let camQuat = new THREE.Quaternion(); camera.object3D.getWorldQuaternion(camQuat);
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

    if (tipo === 'inv') { window.invAberto = !window.invAberto; window.atribAberto = false; window.sysMenuAberto = false; } 
    else if (tipo === 'atrib') { window.atribAberto = !window.atribAberto; window.invAberto = false; window.sysMenuAberto = false; } 
    else if (tipo === 'sys') { window.sysMenuAberto = !window.sysMenuAberto; window.invAberto = false; window.atribAberto = false; }

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

window.receberDanoJogador = function(danoBruto) {
    if (!window.GAME_STARTED || !window.playerState.vivo || window.playerState.invulneravel) return;

    let armaStats = window.bancoDeArmas[window.playerState.armaEquipada];
    let escudoStats = window.bancoDeArmas[window.playerState.nomeEscudo];
    let defesaTotal = window.playerState.defesa + (armaStats ? armaStats.defesaBonus : 0) + (window.playerState.escudoEquipado && escudoStats ? escudoStats.defesaBonus : 0);
    
    let danoFinal = Math.max(1, danoBruto - Math.floor(defesaTotal / 2));
    window.playerState.hpAtual -= danoFinal;
    window.tocarSom('snd-hit');

    let telaDano = document.querySelector('#dano-tela');
    if (telaDano) { telaDano.setAttribute('visible', 'true'); setTimeout(() => telaDano.setAttribute('visible', 'false'), 200); }

    if (window.playerState.hpAtual <= 0) {
        window.playerState.hpAtual = 0; window.playerState.vivo = false;
        let aviso = document.querySelector('#texto-central');
        if(aviso) { aviso.setAttribute('value', 'VOCÊ MORREU!'); aviso.setAttribute('color', '#ff0000'); aviso.setAttribute('visible', 'true'); }

        setTimeout(() => {
            let resp = window.playerState.ultimoRespawn; let rig = document.querySelector('#rig');
            if (rig && resp) { rig.object3D.position.set(resp.x, resp.y, resp.z); } 
            else if (rig) { rig.object3D.position.set(0, 0, 0); }
            
            window.playerState.hpAtual = window.playerState.hpMax; window.playerState.vivo = true; window.playerState.invulneravel = true;
            if(aviso) aviso.setAttribute('visible', 'false');
            
            window.atualizarUI(); window.salvarJogoNuvem();
            setTimeout(() => { window.playerState.invulneravel = false; }, 3000);
        }, 3000);
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
    
    window.posicionarMenuDeFrente('#caixa-dialogo'); cx.setAttribute('visible', 'true'); window.destravarMousePC(); 
    let rig = document.querySelector('#rig'); if (rig) rig.setAttribute('movement-controls', 'enabled', 'false');
};

window.fecharDialogoNPC = function() {
    let cx = document.querySelector('#caixa-dialogo'); 
    if(cx) { cx.setAttribute('scale', '0 0 0'); cx.setAttribute('visible', 'false'); }
    window.npcAtivo = null;
    if (!window.invAberto && !window.atribAberto && !window.sysMenuAberto) {
        window.travarMousePC();
        let rig = document.querySelector('#rig'); if (rig) rig.setAttribute('movement-controls', 'enabled', 'true');
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

window.gerarParticulaRastro = function(pos, vel, corHex = '#00FFFF') {
    let scene = document.querySelector('a-scene'); let p = document.createElement('a-entity');
    let rX = pos.x + (Math.random() - 0.5) * 0.2; let rY = pos.y + (Math.random() - 0.5) * 0.2; let rZ = pos.z + (Math.random() - 0.5) * 0.2;
    p.setAttribute('position', `${rX} ${rY} ${rZ}`);
    p.setAttribute('geometry', 'primitive: box; width: 0.015; height: 0.015; depth: 0.15');
    p.setAttribute('material', `color: ${corHex}; emissive: ${corHex}; emissiveIntensity: 3; shader: flat; transparent: true; blending: additive; depthWrite: false`);
    if (vel && vel.lengthSq() > 0.01) { p.object3D.lookAt(new THREE.Vector3(rX, rY, rZ).add(vel)); }
    p.setAttribute('animation__scale', 'property: scale; to: 0 0 0; dur: 400; easing: linear');
    scene.appendChild(p); setTimeout(() => { if(p && p.parentNode) p.parentNode.removeChild(p); }, 400);
};

window.gerarSwingVFX = function(vetorVelocidade, armaStats, alvoSelector) {
    if (!armaStats.swingAnim || armaStats.swingAnim.trim() === '') return;
    let scene = document.querySelector('a-scene'); let vfx = document.createElement('a-entity');
    let cam = document.querySelector('[camera]'); let camQuat = new THREE.Quaternion(); if(cam) cam.object3D.getWorldQuaternion(camQuat);
    let velLocal = vetorVelocidade.clone().applyQuaternion(camQuat.clone().invert()); let angleZ = Math.atan2(velLocal.y, velLocal.x); 
    let rotBaseArr = (armaStats.swingRotacao || '0 0 0').split(' '); let rX = parseFloat(rotBaseArr[0]) || 0; let rY = parseFloat(rotBaseArr[1]) || 0; let rZ = parseFloat(rotBaseArr[2]) || 0;
    let finalAngleZ = angleZ + THREE.MathUtils.degToRad(rZ);
    let escBase = (armaStats.swingEscala || '1 1 1').split(' '); let sX = parseFloat(escBase[0]) || 1; let sY = parseFloat(escBase[1]) || 1; let sZ = parseFloat(escBase[2]) || 1;
    let additive = armaStats.swingAdditive ? '; blending: additive' : ''; let offsetFrente = alvoSelector === '[camera]' ? -1.5 : -0.6; 
    vfx.setAttribute('efeito-rastro', `alvoId: ${alvoSelector}; offsetZ: ${offsetFrente}; angleZ: ${finalAngleZ}; rotX: ${rX}; rotY: ${rY}`);

    if (armaStats.swingAnim.endsWith('.png') || armaStats.swingAnim.endsWith('.jpg') || armaStats.swingAnim.endsWith('.gif')) {
        let shader = armaStats.swingAnim.endsWith('.gif') ? 'gif' : 'flat';
        let imgMaterial = `shader: ${shader}; src: url(${armaStats.swingAnim}); transparent: true; alphaTest: 0.5; side: double; depthWrite: false${additive}`;
        vfx.innerHTML = `<a-entity geometry="primitive: plane; width: ${sX}; height: ${sY}" material="${imgMaterial}"></a-entity>`;
    } else {
        let glbPath = armaStats.swingAnim.startsWith('#') ? armaStats.swingAnim : `url(${armaStats.swingAnim})`;
        vfx.innerHTML = `<a-entity gltf-model="${glbPath}" scale="${sX} ${sY} ${sZ}" animation-mixer="loop: once; clampWhenFinished: true;"></a-entity>`;
    }
    scene.appendChild(vfx); setTimeout(() => { if (vfx && vfx.parentNode) vfx.parentNode.removeChild(vfx); }, 600); 
};

window.gerarHitVFX = function(pos, armaStats, direcaoImpacto = null) {
    let scene = document.querySelector('a-scene'); let vfx = document.createElement('a-entity');
    let offsetX = (Math.random() - 0.5) * 0.4; let offsetY = (Math.random() - 0.5) * 0.4; let offsetZ = (Math.random() - 0.5) * 0.4;
    vfx.setAttribute('position', `${pos.x + offsetX} ${pos.y + offsetY} ${pos.z + offsetZ}`);
    
    let cam = document.querySelector('[camera]'); 
    let camQuat = new THREE.Quaternion(); 
    if(cam) { 
        cam.object3D.getWorldQuaternion(camQuat); 
        vfx.object3D.quaternion.copy(camQuat); 
    }

    if (armaStats && armaStats.hitAnim && armaStats.hitAnim.trim() !== '') {
        let escBase = (armaStats.hitEscala || '1 1 1').split(' '); let sX = parseFloat(escBase[0]) || 1; let sY = parseFloat(escBase[1]) || 1; let sZ = parseFloat(escBase[2]) || 1;
        let additive = armaStats.hitAdditive ? '; blending: additive' : ''; let shaderTipo = armaStats.hitAnim.toLowerCase().endsWith('.gif') ? 'gif' : 'flat';

        if (armaStats.hitAnim.endsWith('.png') || armaStats.hitAnim.endsWith('.jpg') || armaStats.hitAnim.endsWith('.gif')) {
            let imgMaterial = `shader: ${shaderTipo}; src: url(${armaStats.hitAnim}); transparent: true; alphaTest: 0.5; side: double; depthWrite: false${additive}`;
            vfx.innerHTML = `<a-entity geometry="primitive: plane; width: ${sX}; height: ${sY}" material="${imgMaterial}"></a-entity>`;
        } else {
            let glbPath = armaStats.hitAnim.startsWith('#') ? armaStats.hitAnim : `url(${armaStats.hitAnim})`;
            vfx.innerHTML = `<a-entity gltf-model="${glbPath}" scale="${sX} ${sY} ${sZ}" animation-mixer="loop: once; clampWhenFinished: true;"></a-entity>`;
        }
        scene.appendChild(vfx); setTimeout(() => { if (vfx && vfx.parentNode) vfx.parentNode.removeChild(vfx); }, 600);
        return;
    }

    if (armaStats && armaStats.categoria === 'Shuriken') {
        vfx.innerHTML = `
            <a-entity rotation="0 0 0" animation__rot="property: rotation; to: 0 0 180; dur: 150; easing: linear">
                <a-box color="#ffffff" width="0.03" height="1.2" depth="0.03" material="shader: flat; emissive: #ffffff; emissiveIntensity: 3; transparent: true; blending: additive; depthWrite: false" animation__scale="property: scale; to: 0 1.5 0; dur: 150" animation__fade="property: material.opacity; to: 0; dur: 150"></a-box>
                <a-box color="#ffffff" width="0.03" height="1.2" depth="0.03" rotation="0 0 90" material="shader: flat; emissive: #ffffff; emissiveIntensity: 3; transparent: true; blending: additive; depthWrite: false" animation__scale="property: scale; to: 0 1.5 0; dur: 150" animation__fade="property: material.opacity; to: 0; dur: 150"></a-box>
            </a-entity>
            <a-sphere radius="0.3" color="#ffaa00" material="shader: flat; emissive: #ffaa00; emissiveIntensity: 2; transparent: true; blending: additive; depthWrite: false" animation__scale="property: scale; to: 2 2 2; dur: 150" animation__fade="property: material.opacity; to: 0; dur: 150"></a-sphere>
        `;
        scene.appendChild(vfx);
        setTimeout(() => { if (vfx && vfx.parentNode) vfx.parentNode.removeChild(vfx); }, 200);
    }
    else if (armaStats && armaStats.categoria === 'Espada') {
        let corCorte = '#00FFFF';
        if(armaStats.danoBonus > 10) corCorte = '#ff0055'; 
        else if(armaStats.danoBonus > 6) corCorte = '#f1c40f';

        let rotZ = (Math.random() - 0.5) * 90; 
        if (direcaoImpacto) {
            let localDir = direcaoImpacto.clone();
            if(cam) {
                let camInv = camQuat.clone().invert();
                localDir.applyQuaternion(camInv);
                rotZ = THREE.MathUtils.radToDeg(Math.atan2(localDir.y, localDir.x)) + 90; 
            }
        }

        vfx.innerHTML = `
            <a-sphere radius="0.25" color="#ffffff" material="shader: flat; emissive: #ffffff; emissiveIntensity: 5; transparent: true; blending: additive; depthWrite: false" animation__scale="property: scale; to: 3 3 3; dur: 150; easing: easeOutQuad" animation__fade="property: material.opacity; to: 0; dur: 150; easing: easeOutQuad"></a-sphere>
            <a-box color="${corCorte}" width="0.04" height="2.2" depth="0.04" rotation="0 0 ${rotZ}" material="shader: flat; emissive: ${corCorte}; emissiveIntensity: 4; transparent: true; blending: additive; depthWrite: false" animation__scale="property: scale; to: 0.1 3 0.1; dur: 200; easing: easeOutQuad" animation__fade="property: material.opacity; to: 0; dur: 200; easing: easeOutQuad"></a-box>
        `;
        scene.appendChild(vfx);
        setTimeout(() => { if (vfx && vfx.parentNode) vfx.parentNode.removeChild(vfx); }, 250);
    } 
    else if (armaStats && armaStats.categoria === 'Luva') {
        vfx.innerHTML = `
            <a-torus radius="0.2" radius-tubular="0.05" color="#ff4500" material="shader: flat; emissive: #ff4500; emissiveIntensity: 3; transparent: true; blending: additive; depthWrite: false" animation__scale="property: scale; to: 4 4 4; dur: 250; easing: easeOutCubic" animation__fade="property: material.opacity; to: 0; dur: 250; easing: easeOutCubic"></a-torus>
            <a-sphere radius="0.4" color="#ffdd00" material="shader: flat; emissive: #ffdd00; emissiveIntensity: 2; transparent: true; blending: additive; depthWrite: false" animation__scale="property: scale; to: 2.5 2.5 2.5; dur: 150; easing: easeOutCubic" animation__fade="property: material.opacity; to: 0; dur: 150; easing: easeOutCubic"></a-sphere>
            <a-entity rotation="0 0 0" animation__rot="property: rotation; to: 0 0 90; dur: 200">
                <a-cone color="#ffffff" radius-bottom="0.1" radius-top="0" height="0.8" position="0 0.4 0" material="shader: flat; emissive: #ffffff; emissiveIntensity: 2; transparent: true; blending: additive" animation__pos="property: position; to: 0 1.2 0; dur: 200; easing: easeOutQuad" animation__scale="property: scale; to: 0.1 2 0.1; dur: 200" animation__fade="property: material.opacity; to: 0; dur: 200"></a-cone>
                <a-cone color="#ffffff" radius-bottom="0.1" radius-top="0" height="0.8" position="0 -0.4 0" rotation="180 0 0" material="shader: flat; emissive: #ffffff; emissiveIntensity: 2; transparent: true; blending: additive" animation__pos="property: position; to: 0 -1.2 0; dur: 200; easing: easeOutQuad" animation__scale="property: scale; to: 0.1 2 0.1; dur: 200" animation__fade="property: material.opacity; to: 0; dur: 200"></a-cone>
                <a-cone color="#ffffff" radius-bottom="0.1" radius-top="0" height="0.8" position="0.4 0 0" rotation="0 0 -90" material="shader: flat; emissive: #ffffff; emissiveIntensity: 2; transparent: true; blending: additive" animation__pos="property: position; to: 1.2 0 0; dur: 200; easing: easeOutQuad" animation__scale="property: scale; to: 0.1 2 0.1; dur: 200" animation__fade="property: material.opacity; to: 0; dur: 200"></a-cone>
                <a-cone color="#ffffff" radius-bottom="0.1" radius-top="0" height="0.8" position="-0.4 0 0" rotation="0 0 90" material="shader: flat; emissive: #ffffff; emissiveIntensity: 2; transparent: true; blending: additive" animation__pos="property: position; to: -1.2 0 0; dur: 200; easing: easeOutQuad" animation__scale="property: scale; to: 0.1 2 0.1; dur: 200" animation__fade="property: material.opacity; to: 0; dur: 200"></a-cone>
            </a-entity>
        `;
        scene.appendChild(vfx);
        setTimeout(() => { if (vfx && vfx.parentNode) vfx.parentNode.removeChild(vfx); }, 300);
    }
    else {
        vfx.innerHTML = `<a-sphere radius="0.3" color="#ff0000" material="shader: flat; emissive: #ff0000; emissiveIntensity: 2; transparent: true; blending: additive; depthWrite: false" animation__scale="property: scale; to: 2 2 2; dur: 200" animation__fade="property: material.opacity; to: 0; dur: 200"></a-sphere>`;
        scene.appendChild(vfx);
        setTimeout(() => { if (vfx && vfx.parentNode) vfx.parentNode.removeChild(vfx); }, 250);
    }
};

// === FASE 1 DO SAO: FEIXES DE LUZ ===
window.gerarFeixesBoss = function(pos, escala) {
    let scene = document.querySelector('a-scene');
    window.tocarSom('snd-magic'); 
    
    let beams = document.createElement('a-entity');
    beams.setAttribute('position', `${pos.x} ${pos.y} ${pos.z}`);
    
    for(let i=0; i<6; i++) {
        let beam = document.createElement('a-cylinder');
        beam.setAttribute('color', '#00ffff');
        beam.setAttribute('radius', '0.3'); 
        beam.setAttribute('height', '15');
        beam.setAttribute('material', 'shader: flat; transparent: true; blending: additive; opacity: 0.8');
        beam.setAttribute('rotation', `${(Math.random()-0.5)*90} ${(Math.random()-0.5)*90} ${(Math.random()-0.5)*90}`);
        beam.setAttribute('animation__scale', `property: scale; from: 0.1 0.1 0.1; to: 1 3 1; dur: 1500; easing: easeOutQuad`);
        beam.setAttribute('animation__fade', `property: material.opacity; to: 0.2; dur: 1500; easing: easeInQuad`);
        beams.appendChild(beam);
    }
    scene.appendChild(beams);
    return beams; 
};

// === FASE 2 DO SAO: EXPLOSÃO EM PARTÍCULAS ===
window.gerarParticulasSAO = function(pos, isBoss, escala) {
    let scene = document.querySelector('a-scene');
    window.tocarSom('snd-magic');

    let count = isBoss ? 80 : 30; 
    let color = isBoss ? '#ff0055' : '#00ffff'; 

    for (let i = 0; i < count; i++) {
        let p = document.createElement('a-entity');
        
        let px = pos.x + (Math.random() - 0.5) * 0.2;
        let py = pos.y + (Math.random() - 0.5) * 0.2;
        let pz = pos.z + (Math.random() - 0.5) * 0.2;
        
        let tx = px + (Math.random() - 0.5) * 6;
        let ty = py + (Math.random() - 0.5) * 6; 
        let tz = pz + (Math.random() - 0.5) * 6;

        p.setAttribute('position', `${px} ${py} ${pz}`);
        p.setAttribute('geometry', 'primitive: box; width: 0.15; height: 0.15; depth: 0.15');
        p.setAttribute('material', `color: ${color}; shader: flat; transparent: true; blending: additive`);
        
        p.setAttribute('animation__pos', `property: position; to: ${tx} ${ty} ${tz}; dur: ${800 + Math.random()*700}; easing: easeOutCubic`);
        p.setAttribute('animation__rot', `property: rotation; to: ${Math.random()*720} ${Math.random()*720} ${Math.random()*720}; dur: 1000; loop: true`);
        p.setAttribute('animation__scale', `property: scale; to: 0 0 0; dur: ${800 + Math.random()*700}; easing: easeInQuad`);
        
        scene.appendChild(p);
        setTimeout(() => { if (p.parentNode) p.parentNode.removeChild(p); }, 1600);
    }
};

window.realizarAtaque = function() {
    if(!window.GAME_STARTED || !window.playerState.vivo || window.npcAtivo || window.invAberto || window.atribAberto || window.sysMenuAberto) return;
    let armaStats = window.bancoDeArmas[window.playerState.armaEquipada] || window.bancoDeArmas['Desarmado']; 

    if (window.GAME_MODE === 'VR' && armaStats.categoria !== 'Arco' && armaStats.categoria !== 'Luva') { return; }

    window.comboAtaque = window.comboAtaque === 0 ? 1 : 0; 
    
    let pcWeapon = document.querySelector('#arma-visual-pc'); 
    let pcShield = document.querySelector('#escudo-visual-pc');
    let cameraObj = document.querySelector('[camera]'); if(!cameraObj) return;
    
    let posCamera = new THREE.Vector3(); let direcao = new THREE.Vector3(0, 0, -1); 
    cameraObj.object3D.getWorldPosition(posCamera); let camQuat = new THREE.Quaternion(); cameraObj.object3D.getWorldQuaternion(camQuat);
    direcao.applyQuaternion(camQuat);

    if (armaStats.categoria === 'Luva' || armaStats.categoria === 'Espada' || armaStats.categoria === 'Escudo') {
        window.tocarSom('snd-sword');
        let dirImpacto = new THREE.Vector3(window.comboAtaque === 0 ? 1 : -1, -0.5, 0).applyQuaternion(camQuat);

        if (armaStats.categoria === 'Luva') {
            if (window.comboAtaque === 0 && pcWeapon) { pcWeapon.removeAttribute('animation'); pcWeapon.setAttribute('animation', 'property: position; to: 0.3 -0.3 -1.2; dur: 150; dir: alternate; loop: 1'); setTimeout(() => { if(pcWeapon) pcWeapon.setAttribute('position', '0.3 -0.3 -0.6'); }, 300); }
            else if (window.comboAtaque === 1 && pcShield) { pcShield.removeAttribute('animation'); pcShield.setAttribute('animation', 'property: position; to: -0.4 -0.2 -1.2; dur: 150; dir: alternate; loop: 1'); setTimeout(() => { if(pcShield) pcShield.setAttribute('position', '-0.4 -0.2 -0.5'); }, 300); }
            let vfxVento = document.createElement('a-entity'); let offXVento = window.comboAtaque === 0 ? 0.3 : -0.4; let posSoco = posCamera.clone().add(new THREE.Vector3(offXVento, -0.2, 0).applyQuaternion(camQuat)); vfxVento.setAttribute('position', `${posSoco.x} ${posSoco.y} ${posSoco.z}`); vfxVento.object3D.quaternion.copy(camQuat); vfxVento.innerHTML = `<a-cone color="#ffffff" radius-bottom="0.2" radius-top="0.5" height="2" position="0 0 -1" rotation="-90 0 0" material="shader: flat; transparent: true; opacity: 0.4; blending: additive; depthWrite: false" animation__scale="property: scale; to: 1.5 2 1.5; dur: 200; easing: easeOutQuad" animation__pos="property: position; to: 0 0 -2.5; dur: 200; easing: easeOutQuad" animation__fade="property: material.opacity; to: 0; dur: 200; easing: easeOutQuad"></a-cone><a-torus color="#ffffff" radius="0.3" radius-tubular="0.02" position="0 0 -0.8" material="shader: flat; transparent: true; opacity: 0.6; blending: additive; depthWrite: false" animation__scale="property: scale; to: 4 4 4; dur: 200; easing: easeOutQuad" animation__pos="property: position; to: 0 0 -2; dur: 200; easing: easeOutQuad" animation__fade="property: material.opacity; to: 0; dur: 200; easing: easeOutQuad"></a-torus>`; document.querySelector('a-scene').appendChild(vfxVento); setTimeout(() => { if(vfxVento.parentNode) vfxVento.parentNode.removeChild(vfxVento); }, 250);
        } else {
            if(pcWeapon) { pcWeapon.removeAttribute('animation'); let rotTo = window.comboAtaque === 0 ? '-60 45 -45' : '-60 -45 45'; pcWeapon.setAttribute('animation', `property: rotation; to: ${rotTo}; dur: 150; dir: alternate; loop: 1`); setTimeout(() => { if(pcWeapon) pcWeapon.setAttribute('rotation', '-90 0 0'); }, 300); }
            if (armaStats.categoria === 'Espada') {
                let corRastro = '#00FFFF';
                if (armaStats && armaStats.danoBonus) {
                    if(armaStats.danoBonus >= 15) corRastro = '#ff0055'; 
                    else if(armaStats.danoBonus >= 7) corRastro = '#f1c40f'; 
                }
                let rastroEntidade = document.createElement('a-entity');
                rastroEntidade.setAttribute('position', '0 0 0');
                document.querySelector('a-scene').appendChild(rastroEntidade);
                rastroEntidade.setAttribute('rastro-espada-sao', `color: ${corRastro}; duracao: 400`);

                let count = 0;
                let maxCount = 12; 
                let arcInt = setInterval(() => {
                    if(count > maxCount) { 
                        clearInterval(arcInt); 
                        if(rastroEntidade.components['rastro-espada-sao']) rastroEntidade.components['rastro-espada-sao'].finalizar();
                        return; 
                    }
                    
                    let progresso = count / maxCount;
                    let angulo = (progresso * Math.PI) - (Math.PI / 2); 
                    
                    let offX = 1.5 * Math.sin(angulo); 
                    if (window.comboAtaque === 1) offX = -offX; 

                    let offY = 0.2 - (progresso * 0.4);  
                    let offZ = -1.2 + (Math.cos(angulo) * 0.8);
                    
                    let offVectorBase = new THREE.Vector3(offX * 0.2, offY, offZ * 0.4).applyQuaternion(camQuat);
                    let offVectorPonta = new THREE.Vector3(offX, offY + 0.3, offZ).applyQuaternion(camQuat);
                    
                    let pBase = posCamera.clone().add(offVectorBase);
                    let pPonta = posCamera.clone().add(offVectorPonta);
                    
                    if(rastroEntidade.components['rastro-espada-sao']) {
                        rastroEntidade.components['rastro-espada-sao'].addPonto(pBase, pPonta);
                    }
                    
                    count++;
                }, 20);
            }
        }

        // CORREÇÃO: Usando checarColisaoOssos para o ataque Corpo a Corpo do PC!
        let alcanceArma = armaStats.distancia || 3.0; 
        let posAtaquePC = posCamera.clone().add(direcao.clone().multiplyScalar(alcanceArma * 0.5));
        let boxAtaquePC = new THREE.Box3().setFromCenterAndSize(posAtaquePC, new THREE.Vector3(alcanceArma, alcanceArma, alcanceArma));

        let inimigosEls = document.querySelectorAll('[sistema-inimigo-sync]');
        inimigosEls.forEach(inimigoEl => { 
            let syncComp = inimigoEl.components['sistema-inimigo-sync']; if(syncComp && syncComp.hpAtual <= 0) return;
            
            let colisorNode = inimigoEl.querySelector('.colisao-inimigo'); let boxInimigo = new THREE.Box3();
            if(colisorNode) { colisorNode.object3D.updateMatrixWorld(true); boxInimigo.setFromObject(colisorNode.object3D); } else { inimigoEl.object3D.updateMatrixWorld(true); boxInimigo.setFromObject(inimigoEl.object3D); }
            
            if (boxAtaquePC.intersectsBox(boxInimigo)) {
                let precisaoHit = window.checarColisaoOssos(boxAtaquePC, posAtaquePC, inimigoEl, alcanceArma);
                if (precisaoHit) {
                    syncComp.receberDano(Math.floor((window.playerState.forca + armaStats.danoBonus) * 1.5), armaStats.categoria); 
                    window.gerarHitVFX(precisaoHit, armaStats, dirImpacto);
                }
            }
        });

    } else {
        window.tocarSom('snd-magic');
        let maxDist = armaStats.distancia || 20;
        let dirCam = new THREE.Vector3(0, 0, -1).applyQuaternion(camQuat).normalize();
        
        let bestTarget = null;
        let minAngle = 0.90; 
        
        let inimigosEls = document.querySelectorAll('[sistema-inimigo-sync]');
        inimigosEls.forEach(inimigoEl => {
            let syncComp = inimigoEl.components['sistema-inimigo-sync'];
            if(syncComp && syncComp.hpAtual > 0) {
                let posInimigo = new THREE.Vector3(); inimigoEl.object3D.getWorldPosition(posInimigo);
                posInimigo.y += 1.0; 
                let dist = posCamera.distanceTo(posInimigo);
                
                if (dist <= maxDist) {
                    let dirToEnemy = posInimigo.clone().sub(posCamera).normalize();
                    let angleDot = dirCam.dot(dirToEnemy);
                    if (angleDot > minAngle) {
                        minAngle = angleDot;
                        bestTarget = posInimigo;
                    }
                }
            }
        });

        let targetPoint = new THREE.Vector3();
        if (bestTarget) { targetPoint.copy(bestTarget); } else { targetPoint = posCamera.clone().add(dirCam.multiplyScalar(maxDist)); }

        let proj = document.createElement('a-entity');
        let spawnPos = posCamera.clone().add(dirCam.clone().multiplyScalar(0.5));
        spawnPos.y -= 0.2; 
        proj.setAttribute('position', `${spawnPos.x} ${spawnPos.y} ${spawnPos.z}`);
        
        let shootDir = targetPoint.clone().sub(spawnPos).normalize();
        
        let projVel = armaStats.categoria === 'Shuriken' ? (armaStats.shurikenVel * 8 || 15) : (armaStats.projetilVel || 20);
        let danoFinal = Math.floor((window.playerState.forca + armaStats.danoBonus) * 1.5);
        
        proj.setAttribute('projetil-jogador', `velocidade: ${shootDir.x * projVel} ${shootDir.y * projVel} ${shootDir.z * projVel}; dano: ${danoFinal}; arma: ${armaStats.categoria}`);

        if (armaStats.categoria === 'Shuriken') {
            proj.innerHTML = `
                <a-entity animation="property: rotation; to: 0 360 0; loop: true; dur: 150; easing: linear">
                    <a-box color="#bdc3c7" width="0.25" height="0.02" depth="0.25" rotation="0 0 0"></a-box>
                    <a-box color="#bdc3c7" width="0.25" height="0.02" depth="0.25" rotation="0 45 0"></a-box>
                </a-entity>
            `;
        } else if (armaStats.categoria === 'Varinha') {
            let glbPath = armaStats.projetilGlb ? `url(${armaStats.projetilGlb})` : '';
            if(glbPath) { proj.innerHTML = `<a-entity gltf-model="${glbPath}" scale="${armaStats.projetilEscala || '1 1 1'}"></a-entity>`; } 
            else { proj.innerHTML = `<a-sphere radius="0.1" color="#00ffff" material="emissive: #00ffff; emissiveIntensity: 2"></a-sphere>`; }
        } else if (armaStats.categoria === 'Arco') {
            proj.innerHTML = `<a-cylinder radius="0.02" height="0.8" color="#fff" rotation="90 0 0"></a-cylinder>`;
        }
        
        proj.object3D.lookAt(targetPoint); 
        document.querySelector('a-scene').appendChild(proj);
    }
};

function iniciarTelaSelecaoModo() { 
    document.getElementById('login-menu').style.display = 'none'; 
    if (window.currentUser && window.currentUser.uid && !window.currentUser.uid.startsWith('teste_')) { 
        firestoreDB.collection("jogadores").doc(window.currentUser.uid).get().then((doc) => { 
            if (doc.exists && doc.data().personagemCriado) { 
                window.playerState = Object.assign(window.playerState, doc.data()); 
                if(window.playerState.hpAtual <= 0) { window.playerState.hpAtual = window.playerState.hpMax; window.playerState.vivo = true; }
                document.getElementById('start-menu').style.display = 'block'; 
            } else { window.location.href = 'create.html'; }
        }).catch(e => console.error("Erro ao carregar save", e)); 
    } else { document.getElementById('start-menu').style.display = 'block'; }
}

function iniciarJogo(modo) { 
    window.GAME_MODE = modo; window.GAME_STARTED = true; 
    document.getElementById('ui-layer').style.display = 'none'; document.body.classList.remove('menu-aberto');
    window.playerState.invulneravel = true; setTimeout(() => { window.playerState.invulneravel = false; }, 3000);

    let maoEsq = document.querySelector('#mao-esquerda'); let maoDir = document.querySelector('#mao-direita');
    let cursor = document.querySelector('#cursor-centro'); let wpPc = document.querySelector('#arma-visual-pc'); let scPc = document.querySelector('#escudo-visual-pc');
    let cam = document.querySelector('[camera]'); let rig = document.querySelector('#rig');

    if(rig) { let r = window.playerState.ultimoRespawn; if(r) rig.setAttribute('position', `${r.x} ${r.y} ${r.z}`); }
    window.renderizarInventario(); 

    if (modo === 'PC') { 
        if(maoEsq) { maoEsq.setAttribute('visible', 'false'); maoEsq.setAttribute('raycaster', 'far', 0); }
        if(maoDir) { maoDir.setAttribute('visible', 'false'); maoDir.setAttribute('raycaster', 'far', 0); }
        document.getElementById('crosshair').style.display = 'block'; document.getElementById('pc-ui').style.display = 'block'; 
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
}

document.addEventListener('DOMContentLoaded', () => { 
    document.body.classList.add('menu-aberto');
    ['mousedown', 'keydown', 'touchstart'].forEach(e => window.addEventListener(e, () => window.lastActionTime = Date.now()));
    
    function mostrarErroLogin(msg) { let errBox = document.getElementById('login-error'); errBox.style.display = 'block'; errBox.innerText = msg; }

    document.getElementById('btn-registrar').addEventListener('click', function(e) { 
        e.preventDefault(); let btn = document.getElementById('btn-registrar'); let errBox = document.getElementById('login-error');
        let email = document.getElementById('login-email').value; let senha = document.getElementById('login-senha').value; 
        if(!email || !senha) { mostrarErroLogin("⚠️ Preencha e-mail e senha!"); return; }
        btn.innerText = "Processando..."; errBox.style.display = 'none'; 
        auth.createUserWithEmailAndPassword(email, senha).then((userCredential) => { window.currentUser = userCredential.user; iniciarTelaSelecaoModo(); }).catch((error) => { btn.innerText = "Criar Conta"; mostrarErroLogin("Erro: " + error.message); }); 
    }); 
    
    document.getElementById('btn-login').addEventListener('click', function(e) { 
        e.preventDefault(); let btn = document.getElementById('btn-login'); let errBox = document.getElementById('login-error');
        let email = document.getElementById('login-email').value; let senha = document.getElementById('login-senha').value; 
        if(!email || !senha) { mostrarErroLogin("⚠️ Preencha e-mail e senha!"); return; }
        btn.innerText = "Conectando..."; errBox.style.display = 'none'; 
        auth.signInWithEmailAndPassword(email, senha).then((userCredential) => { window.currentUser = userCredential.user; iniciarTelaSelecaoModo(); }).catch((error) => { btn.innerText = "Entrar"; mostrarErroLogin("Erro: " + error.message); }); 
    }); 

    auth.onAuthStateChanged((user) => { if (user) { window.currentUser = user; iniciarTelaSelecaoModo(); } });
    
    realtimeDB.ref('server_config/modoTeste').on('value', snap => { let ativo = snap.val() || false; let btnTeste = document.getElementById('btn-login-teste'); if (btnTeste) { btnTeste.style.display = ativo ? 'block' : 'none'; } });

    document.getElementById('btn-login-teste').addEventListener('click', function(e) {
        e.preventDefault(); let errBox = document.getElementById('login-error'); errBox.style.display = 'none';
        let fakeId = 'teste_' + Math.random().toString(36).substr(2, 5); window.currentUser = { uid: fakeId, email: fakeId + '@teste.com' }; iniciarTelaSelecaoModo();
    });
    
    document.getElementById('btn-pc').addEventListener('click', () => { iniciarJogo('PC'); }); 
    document.getElementById('btn-vr').addEventListener('click', () => { iniciarJogo('VR'); }); 
    document.getElementById('btn-android').addEventListener('click', () => { iniciarJogo('ANDROID'); }); 

    document.getElementById('btn-sys-pc').addEventListener('click', () => { window.toggleMenu('sys'); });
    document.getElementById('btn-sys-mobile').addEventListener('touchstart', (e) => { e.preventDefault(); e.stopPropagation(); window.lastActionTime = Date.now(); window.toggleMenu('sys'); }, {passive: false});

    let podeAtacarMobile = true;
    document.getElementById('btn-inv').addEventListener('touchstart', (e) => { e.preventDefault(); e.stopPropagation(); window.lastActionTime = Date.now(); window.toggleMenu('inv'); }, {passive: false});
    document.getElementById('btn-status').addEventListener('touchstart', (e) => { e.preventDefault(); e.stopPropagation(); window.lastActionTime = Date.now(); window.toggleMenu('atrib'); }, {passive: false});
    
    document.getElementById('btn-escudo').addEventListener('touchstart', (e) => { 
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
    
    document.getElementById('btn-atacar').addEventListener('touchstart', (e) => { 
        e.preventDefault(); e.stopPropagation(); window.lastActionTime = Date.now(); 
        if (!podeAtacarMobile) return; 
        podeAtacarMobile = false; 
        setTimeout(() => podeAtacarMobile = true, 400); 
        window.realizarAtaque(); 
    }, {passive: false});

    let podeAtacarPC = true;
    window.addEventListener('mousedown', (e) => {
        if (window.GAME_MODE === 'PC' && window.GAME_STARTED && !window.sysMenuAberto && !window.invAberto && !window.atribAberto) {
            if (e.button === 0 && e.target.tagName === 'CANVAS') { 
                e.preventDefault();
                if (!podeAtacarPC) return; 
                podeAtacarPC = false; 
                setTimeout(() => podeAtacarPC = true, 400); 
                window.realizarAtaque();
            }
        }
    });

    const zone = document.getElementById('joystick-zone'); const stick = document.getElementById('joystick-stick');
    let isDraggingJoy = false; let joyTouchId = null; let centerX, centerY, maxRadius = 40;
    
    zone.addEventListener('touchstart', (e) => { e.preventDefault(); e.stopPropagation(); if(isDraggingJoy) return; isDraggingJoy = true; let touch = e.changedTouches[0]; joyTouchId = touch.identifier; let rect = zone.getBoundingClientRect(); centerX = rect.left + rect.width / 2; centerY = rect.top + rect.height / 2; handleTouch(touch); }, {passive: false});
    zone.addEventListener('touchmove', (e) => { e.preventDefault(); e.stopPropagation(); if(isDraggingJoy) { for(let i=0; i<e.touches.length; i++) { if(e.touches[i].identifier === joyTouchId) { handleTouch(e.touches[i]); break; } } } }, {passive: false});
    const releaseJoystick = (e) => { if(e) { let found = false; for(let i=0; i<e.changedTouches.length; i++) { if(e.changedTouches[i].identifier === joyTouchId) { found = true; break; } } if(!found) return; } isDraggingJoy = false; joyTouchId = null; stick.style.transform = `translate(0px, 0px)`; window.joystickVector = { x: 0, y: 0 }; };
    zone.addEventListener('touchend', releaseJoystick, {passive: false}); zone.addEventListener('touchcancel', releaseJoystick, {passive: false});
    
    function handleTouch(touch) { window.lastActionTime = Date.now(); let dx = touch.clientX - centerX; let dy = touch.clientY - centerY; let distance = Math.sqrt(dx*dx + dy*dy); if (distance > maxRadius) { dx = (dx / distance) * maxRadius; dy = (dy / distance) * maxRadius; } stick.style.transform = `translate(${dx}px, ${dy}px)`; window.joystickVector.x = dx / maxRadius; window.joystickVector.y = dy / maxRadius; }

    setInterval(() => {
        if (window.GAME_STARTED && window.playerState.vivo) {
            if (Date.now() - window.lastActionTime > 900000) { 
                window.GAME_STARTED = false; let mpComp = document.querySelector('[firebase-multiplayer]'); if(mpComp && mpComp.components['firebase-multiplayer'] && mpComp.components['firebase-multiplayer'].myRef) { mpComp.components['firebase-multiplayer'].myRef.remove(); }
                let aviso = document.querySelector('#texto-central'); if(aviso) { aviso.setAttribute('value', 'DESCONECTADO:\n15 MIN INATIVO (AFK)'); aviso.setAttribute('color', '#ff0000'); aviso.setAttribute('visible', 'true'); } setTimeout(() => location.reload(), 4000);
            }
        }
    }, 5000);

    realtimeDB.ref('server_commands/kick_all').on('value', snap => { if(snap.val() && window.GAME_STARTED) { window.GAME_STARTED = false; let aviso = document.querySelector('#texto-central'); if(aviso) { aviso.setAttribute('value', 'KICKADO PELO ADMIN!'); aviso.setAttribute('color', '#ff0000'); aviso.setAttribute('visible', 'true'); } setTimeout(() => location.reload(), 3000); } });
    
    realtimeDB.ref('banco_armas').on('value', snap => {
        let dados = snap.val();
        if(dados) { window.bancoDeArmas = Object.assign(window.bancoDeArmas, dados); }
        if(window.renderizarInventario) window.renderizarInventario();
        if(window.GAME_STARTED) window.atualizarUI();
    });

    window.addEventListener('keydown', (e) => {
        if (window.GAME_MODE === 'PC' && window.GAME_STARTED && !window.npcAtivo) {
            let key = e.key.toLowerCase();
            if (key === 'i') { e.preventDefault(); window.toggleMenu('inv'); } 
            else if (key === 'o') { e.preventDefault(); window.toggleMenu('atrib'); }
        }
    });
});
