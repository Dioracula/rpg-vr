// js/game-mechanics.js

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
        window.playerState.hpAtual = 0;
        window.playerState.vivo = false;
        
        let aviso = document.querySelector('#texto-central');
        if(aviso) { aviso.setAttribute('value', 'VOCÊ MORREU!'); aviso.setAttribute('color', '#ff0000'); aviso.setAttribute('visible', 'true'); }

        setTimeout(() => {
            let resp = window.playerState.ultimoRespawn;
            let rig = document.querySelector('#rig');
            if (rig && resp) { rig.object3D.position.set(resp.x, resp.y, resp.z); } 
            else if (rig) { rig.object3D.position.set(0, 0, 0); }
            
            window.playerState.hpAtual = window.playerState.hpMax;
            window.playerState.vivo = true;
            window.playerState.invulneravel = true;
            if(aviso) aviso.setAttribute('visible', 'false');
            
            window.atualizarUI(); window.salvarJogoNuvem();
            setTimeout(() => { window.playerState.invulneravel = false; }, 3000);
        }, 3000);
    }
    window.atualizarUI();
};

window.realizarAtaque = function() {
    if(!window.GAME_STARTED || !window.playerState.vivo || window.npcAtivo || window.invAberto || window.atribAberto || window.sysMenuAberto) return;
    let armaStats = window.bancoDeArmas[window.playerState.armaEquipada] || window.bancoDeArmas['Desarmado']; 

    // VR: Espadas normais são gerenciadas pelo 'colisor-arma-vr' na detecção física de swing.
    if (window.GAME_MODE === 'VR' && armaStats.categoria !== 'Arco' && armaStats.categoria !== 'Luva') { return; }

    window.tocarSom('snd-sword');
    let pcWeapon = document.querySelector('#arma-visual-pc'); 
    if(pcWeapon) { pcWeapon.removeAttribute('animation'); pcWeapon.setAttribute('animation', 'property: rotation; to: -60 45 -45; dur: 150; dir: alternate; loop: 1'); setTimeout(() => { if(pcWeapon) pcWeapon.setAttribute('rotation', '-90 0 0'); }, 300); }
    
    let cameraObj = document.querySelector('[camera]'); if(!cameraObj) return;
    let posCamera = new THREE.Vector3(); let direcao = new THREE.Vector3(0, 0, -1); 
    cameraObj.object3D.getWorldPosition(posCamera); 
    let camQuat = new THREE.Quaternion(); cameraObj.object3D.getWorldQuaternion(camQuat);
    direcao.applyQuaternion(camQuat);
    
    // --- GERAÇÃO DO RASTRO/SWING VFX PARA PC E MOBILE (DIAGONAL FIXA) ---
    let simVel = new THREE.Vector3(1, -1, 0); // Sentido do corte na tela (Diagonal direita p/ baixo)
    simVel.applyQuaternion(camQuat).normalize().multiplyScalar(5); // Converte para o mundo real
    window.gerarSwingVFX(simVel, armaStats, '[camera]');

    // Arco de partículas simulado para PC/Mobile
    let count = 0;
    let arcInt = setInterval(() => {
        if(count > 6) { clearInterval(arcInt); return; }
        let offX = 0.5 - (count * 0.15); // Move da direita pra esquerda
        let offY = 0.2 - (count * 0.1);  // Move de cima pra baixo
        let offVector = new THREE.Vector3(offX, offY, -1.2).applyQuaternion(camQuat);
        let pPos = posCamera.clone().add(offVector);
        window.gerarParticulaRastro(pPos, simVel, '#00FFFF');
        window.gerarParticulaRastro(pPos, simVel, '#FFFFFF'); // Miolo branco
        count++;
    }, 30);

    let dirCam2D = new THREE.Vector2(direcao.x, direcao.z); 
    if (dirCam2D.lengthSq() > 0.001) dirCam2D.normalize();
    
    let alcanceArma = armaStats.distancia || 3.0; 

    let inimigosEls = document.querySelectorAll('[sistema-inimigo-sync]');
    inimigosEls.forEach(inimigoEl => { 
        if(!inimigoEl.object3D) return; 
        let syncComp = inimigoEl.components['sistema-inimigo-sync']; 
        if(syncComp && syncComp.hpAtual <= 0) return;

        let posInimigo = new THREE.Vector3(); 
        inimigoEl.object3D.getWorldPosition(posInimigo); 
        
        let dx = posInimigo.x - posCamera.x; let dz = posInimigo.z - posCamera.z;
        let dist2D = Math.hypot(dx, dz);
        
        if (dist2D <= alcanceArma) { 
            let dirInimigo2D = new THREE.Vector2(dx, dz); 
            if (dist2D > 0.001) dirInimigo2D.normalize();
            let anguloAcerto = dirCam2D.dot(dirInimigo2D); 
            
            if (anguloAcerto > 0.0) { 
                if(syncComp) { 
                    syncComp.receberDano(Math.floor((window.playerState.forca + armaStats.danoBonus) * 1.5), armaStats.categoria); 
                    
                    // --- GERA O EFEITO DE HIT NO INIMIGO ---
                    let posHit = new THREE.Vector3();
                    inimigoEl.object3D.getWorldPosition(posHit);
                    posHit.y += 1.0; 
                    window.gerarHitVFX(posHit, armaStats);
                }
            }
        } 
    });
};

window.gerarParticulaRastro = function(pos, vel, corHex = '#00FFFF') {
    let scene = document.querySelector('a-scene');
    let p = document.createElement('a-entity');
    let rX = pos.x + (Math.random() - 0.5) * 0.2;
    let rY = pos.y + (Math.random() - 0.5) * 0.2;
    let rZ = pos.z + (Math.random() - 0.5) * 0.2;
    p.setAttribute('position', `${rX} ${rY} ${rZ}`);
    
    p.setAttribute('geometry', 'primitive: box; width: 0.015; height: 0.015; depth: 0.15');
    p.setAttribute('material', `color: ${corHex}; emissive: ${corHex}; emissiveIntensity: 3; shader: flat; transparent: true; blending: additive; depthWrite: false`);
    
    if (vel && vel.lengthSq() > 0.01) {
        p.object3D.lookAt(new THREE.Vector3(rX, rY, rZ).add(vel));
    }

    p.setAttribute('animation__scale', 'property: scale; to: 0 0 0; dur: 400; easing: linear');
    scene.appendChild(p);
    setTimeout(() => { if(p && p.parentNode) p.parentNode.removeChild(p); }, 400);
};

window.gerarSwingVFX = function(vetorVelocidade, armaStats, alvoSelector) {
    if (!armaStats.swingAnim || armaStats.swingAnim.trim() === '') return;

    let scene = document.querySelector('a-scene');
    let vfx = document.createElement('a-entity');

    let cam = document.querySelector('[camera]');
    let camQuat = new THREE.Quaternion();
    if(cam) cam.object3D.getWorldQuaternion(camQuat);

    let velLocal = vetorVelocidade.clone().applyQuaternion(camQuat.clone().invert());
    let angleZ = Math.atan2(velLocal.y, velLocal.x); 

    let rotBaseArr = (armaStats.swingRotacao || '0 0 0').split(' ');
    let rX = parseFloat(rotBaseArr[0]) || 0;
    let rY = parseFloat(rotBaseArr[1]) || 0;
    let rZ = parseFloat(rotBaseArr[2]) || 0;

    let finalAngleZ = angleZ + THREE.MathUtils.degToRad(rZ);

    let escBase = (armaStats.swingEscala || '1 1 1').split(' ');
    let sX = parseFloat(escBase[0]) || 1; 
    let sY = parseFloat(escBase[1]) || 1;
    let sZ = parseFloat(escBase[2]) || 1;

    let additive = armaStats.swingAdditive ? '; blending: additive' : '';
    let offsetFrente = alvoSelector === '[camera]' ? -1.5 : -0.6; 

    vfx.setAttribute('efeito-rastro', `alvoId: ${alvoSelector}; offsetZ: ${offsetFrente}; angleZ: ${finalAngleZ}; rotX: ${rX}; rotY: ${rY}`);

    if (armaStats.swingAnim.endsWith('.png') || armaStats.swingAnim.endsWith('.jpg')) {
        let imgMaterial = `src: url(${armaStats.swingAnim}); transparent: true; alphaTest: 0.5; side: double; depthWrite: false${additive}`;
        vfx.innerHTML = `<a-entity geometry="primitive: plane; width: ${sX}; height: ${sY}" material="${imgMaterial}"></a-entity>`;
    } else if (armaStats.swingAnim.endsWith('.gif')) {
        let imgMaterial = `shader: gif; src: url(${armaStats.swingAnim}); transparent: true; alphaTest: 0.5; side: double; depthWrite: false${additive}`;
        vfx.innerHTML = `<a-entity geometry="primitive: plane; width: ${sX}; height: ${sY}" material="${imgMaterial}"></a-entity>`;
    } else {
        let glbPath = armaStats.swingAnim.startsWith('#') ? armaStats.swingAnim : `url(${armaStats.swingAnim})`;
        vfx.innerHTML = `<a-entity gltf-model="${glbPath}" scale="${sX} ${sY} ${sZ}" animation-mixer="loop: once; clampWhenFinished: true;"></a-entity>`;
    }

    scene.appendChild(vfx);
    setTimeout(() => { if (vfx && vfx.parentNode) vfx.parentNode.removeChild(vfx); }, 600); 
};

window.gerarHitVFX = function(pos, armaStats) {
    if (!armaStats.hitAnim || armaStats.hitAnim.trim() === '') return;

    let scene = document.querySelector('a-scene');
    let vfx = document.createElement('a-entity');

    let offsetX = (Math.random() - 0.5) * 0.4;
    let offsetY = (Math.random() - 0.5) * 0.4;
    let offsetZ = (Math.random() - 0.5) * 0.4;

    vfx.setAttribute('position', `${pos.x + offsetX} ${pos.y + offsetY} ${pos.z + offsetZ}`);

    let cam = document.querySelector('[camera]');
    if(cam) {
        let camQuat = new THREE.Quaternion();
        cam.object3D.getWorldQuaternion(camQuat);
        vfx.object3D.quaternion.copy(camQuat); 
    }

    let escBase = (armaStats.hitEscala || '1 1 1').split(' ');
    let sX = parseFloat(escBase[0]) || 1; 
    let sY = parseFloat(escBase[1]) || 1;
    let sZ = parseFloat(escBase[2]) || 1;

    let additive = armaStats.hitAdditive ? '; blending: additive' : '';
    let shaderTipo = armaStats.hitAnim.toLowerCase().endsWith('.gif') ? 'gif' : 'flat';

    if (armaStats.hitAnim.endsWith('.png') || armaStats.hitAnim.endsWith('.jpg') || armaStats.hitAnim.endsWith('.gif')) {
        let imgMaterial = `shader: ${shaderTipo}; src: url(${armaStats.hitAnim}); transparent: true; alphaTest: 0.5; side: double; depthWrite: false${additive}`;
        vfx.innerHTML = `<a-entity geometry="primitive: plane; width: ${sX}; height: ${sY}" material="${imgMaterial}"></a-entity>`;
    } else {
        let glbPath = armaStats.hitAnim.startsWith('#') ? armaStats.hitAnim : `url(${armaStats.hitAnim})`;
        vfx.innerHTML = `<a-entity gltf-model="${glbPath}" scale="${sX} ${sY} ${sZ}" animation-mixer="loop: once; clampWhenFinished: true;"></a-entity>`;
    }

    scene.appendChild(vfx);
    setTimeout(() => { if (vfx && vfx.parentNode) vfx.parentNode.removeChild(vfx); }, 600);
};