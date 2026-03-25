// ==========================================
// COMPONENTES A-FRAME (FÍSICA, VR, MOBILE E UI)
// ==========================================

AFRAME.registerComponent('efeito-rastro', {
    schema: { alvoId: { type: 'string' }, offsetZ: { type: 'number', default: -0.8 }, angleZ: { type: 'number', default: 0 }, rotX: { type: 'number', default: 0 }, rotY: { type: 'number', default: 0 } },
    init: function() { this.alvo = document.querySelector(this.data.alvoId); this.cam = document.querySelector('[camera]'); },
    tick: function() {
        if (!this.alvo || !this.cam) return;
        let pos = new THREE.Vector3(0, 0, this.data.offsetZ); pos.applyMatrix4(this.alvo.object3D.matrixWorld); this.el.object3D.position.copy(pos);
        this.el.object3D.quaternion.copy(this.cam.object3D.getWorldQuaternion(new THREE.Quaternion()));
        this.el.object3D.rotateX(THREE.MathUtils.degToRad(this.data.rotX)); this.el.object3D.rotateY(THREE.MathUtils.degToRad(this.data.rotY)); this.el.object3D.rotateZ(this.data.angleZ);
    }
});

AFRAME.registerComponent('btn-sistema-acao', {
    schema: { acao: { type: 'string' } },
    init: function () {
        const exec = () => {
            if (this.data.acao === 'logout') { window.fazerLogout(); } 
            else if (this.data.acao === 'config') { window.abrirConfiguracoes(); } 
            else if (this.data.acao === 'fechar') { window.toggleMenu('sys'); }
        };
        this.el.addEventListener('mousedown', exec);
        this.el.addEventListener('touchstart', (e) => { e.preventDefault(); e.stopPropagation(); exec(); }, {passive: false});
    }
});

AFRAME.registerComponent('colisor-arma-vr', {
    schema: { mao: { type: 'string' } },
    init: function() {
        this.lastWorldPos = new THREE.Vector3(); this.el.object3D.getWorldPosition(this.lastWorldPos);
        this.lastLocalPos = this.el.object3D.position.clone(); this.cortando = false; this.tempoCorte = 0;
        this.camera = document.querySelector('[camera]'); this.lastHits = new Map(); this.vel = new THREE.Vector3(); this.speed = 0;
    },
    tick: function(time, timeDelta) {
        if (window.GAME_MODE !== 'VR' || !window.playerState.vivo) return;
        let dt = timeDelta / 1000; if (dt === 0) return;

        let armaStats = window.bancoDeArmas[window.playerState.armaEquipada];
        let currentWorldPos = new THREE.Vector3(); this.el.object3D.getWorldPosition(currentWorldPos);
        let currentLocalPos = this.el.object3D.position.clone();

        let deltaWorld = new THREE.Vector3().subVectors(currentWorldPos, this.lastWorldPos);
        this.vel.copy(deltaWorld).divideScalar(dt); this.lastWorldPos.copy(currentWorldPos);

        let deltaLocal = new THREE.Vector3().subVectors(currentLocalPos, this.lastLocalPos);
        this.speed = deltaLocal.length() / dt; this.lastLocalPos.copy(currentLocalPos);

        if (this.data.mao === 'esquerda' && armaStats && armaStats.categoria !== 'Luva') return; 
        if (!armaStats || (armaStats.categoria !== 'Espada' && armaStats.categoria !== 'Luva')) return;

        if (this.speed > 2.0 && !this.cortando) {
            this.cortando = true; this.tempoCorte = time; window.tocarSom('snd-sword');
            let maoId = this.data.mao === 'direita' ? '#mao-direita' : '#mao-esquerda';
            window.gerarSwingVFX(this.vel.clone(), armaStats, maoId);
        }

        if (this.cortando) {
            if (time - this.tempoCorte > 400) { this.cortando = false; } else {
                let posPonta = currentWorldPos.clone();
                if (armaStats.categoria === 'Espada') { let dirPonta = new THREE.Vector3(0, 0, -1).applyQuaternion(this.el.object3D.getWorldQuaternion(new THREE.Quaternion())); posPonta.add(dirPonta.multiplyScalar(0.6)); }
                window.gerarParticulaRastro(posPonta, this.vel, '#FFFFFF');
                if(Math.random() > 0.5) window.gerarParticulaRastro(posPonta, this.vel, '#00FFFF');
            }
        }

        let boxArma = new THREE.Box3(); let visualEl = this.el.querySelector(this.data.mao === 'direita' ? '#arma-visual-dir' : '#arma-visual-esq');
        if (visualEl) { visualEl.object3D.updateMatrixWorld(true); boxArma.setFromObject(visualEl.object3D); }
        if (boxArma.isEmpty()) { boxArma.setFromCenterAndSize(currentWorldPos, new THREE.Vector3(0.2, 0.2, 0.2)); }

        let inimigosEls = document.querySelectorAll('[sistema-inimigo-sync]'); let agora = Date.now();
        inimigosEls.forEach(inimigoEl => {
            let syncComp = inimigoEl.components['sistema-inimigo-sync'];
            if(syncComp && syncComp.hpAtual > 0) {
                let colisorNode = inimigoEl.querySelector('.colisao-inimigo'); let boxInimigo = new THREE.Box3();
                if(colisorNode) { colisorNode.object3D.updateMatrixWorld(true); boxInimigo.setFromObject(colisorNode.object3D); } else { inimigoEl.object3D.updateMatrixWorld(true); boxInimigo.setFromObject(inimigoEl.object3D); }
                if (boxArma.intersectsBox(boxInimigo)) {
                    let lastHit = this.lastHits.get(inimigoEl) || 0;
                    if (this.speed > 1.5 && (agora - lastHit > 400)) { 
                        syncComp.receberDano(Math.floor(window.playerState.forca + armaStats.danoBonus), armaStats.categoria);
                        let posHit = new THREE.Vector3(); inimigoEl.object3D.getWorldPosition(posHit); posHit.y += 1.0;
                        window.gerarHitVFX(posHit, armaStats); this.lastHits.set(inimigoEl, agora);
                    }
                }
            }
        });
    }
});

AFRAME.registerComponent('projetil-inimigo-fisico', {
    schema: { velocidade: {type: 'vec3'}, dano: {type: 'number', default: 10} },
    init: function () { this.vel = new THREE.Vector3(this.data.velocidade.x, this.data.velocidade.y, this.data.velocidade.z); this.camera = document.querySelector('[camera]'); },
    tick: function (time, timeDelta) {
        let dt = timeDelta / 1000; if (dt === 0 || !window.GAME_STARTED) return; 
        if (!window.playerState.vivo) { this.el.remove(); return; }

        this.el.object3D.position.add(this.vel.clone().multiplyScalar(dt));
        if (this.el.object3D.position.y < -1) { this.el.remove(); return; }

        let posProj = new THREE.Vector3(); this.el.object3D.getWorldPosition(posProj);

        if (this.el.dataset.defletido !== "true") {
            let maos = []; let maoEsq = document.querySelector('#mao-esquerda'); let maoDir = document.querySelector('#mao-direita');
            if (maoEsq) maos.push({el: maoEsq, esq: true}); if (maoDir) maos.push({el: maoDir, esq: false});

            for (let i = 0; i < maos.length; i++) {
                let mao = maos[i].el; let isEsq = maos[i].esq;
                let armaStats = window.bancoDeArmas[window.playerState.armaEquipada];
                let isEscudo = isEsq && window.playerState.escudoEquipado;
                let isLuva = (armaStats && armaStats.categoria === 'Luva');
                let isEspada = (!isEsq && armaStats && armaStats.categoria === 'Espada');
                
                if (isEscudo || isLuva || isEspada) {
                    let posMao = new THREE.Vector3(); mao.object3D.getWorldPosition(posMao);
                    let raioColisao = isEspada ? 0.8 : 0.4; if (isEscudo) raioColisao = 0.5;
                    
                    if (posProj.distanceTo(posMao) < raioColisao) {
                        let colisorComp = mao.components['colisor-arma-vr']; let handSpeed = colisorComp ? colisorComp.speed : 0;
                        
                        if (isEscudo) {
                            if (handSpeed > 1.5) {
                                this.el.dataset.defletido = "true"; let handVel = colisorComp ? colisorComp.vel.clone().normalize() : new THREE.Vector3(0, 1, -1).normalize();
                                if (handVel.lengthSq() === 0) handVel.set(0, 1, -1).normalize();
                                this.vel.copy(handVel).multiplyScalar(20); window.tocarSom('snd-sword'); return; 
                            } else { window.tocarSom('snd-hit'); this.el.remove(); return; }
                        } else if (isEspada) {
                            if (handSpeed > 1.5) {
                                window.tocarSom('snd-sword'); this.el.remove(); window.gerarParticulaRastro(posProj, null, '#FFFFFF'); return; 
                            }
                        } else if (isLuva) {
                            if (handSpeed > 1.5) {
                                this.el.dataset.defletido = "true"; let handVel = colisorComp ? colisorComp.vel.clone().normalize() : new THREE.Vector3(0, 1, -1).normalize();
                                if (handVel.lengthSq() === 0) handVel.set(0, 1, -1).normalize();
                                this.vel.copy(handVel).multiplyScalar(20); window.tocarSom('snd-sword'); return; 
                            }
                        }
                    }
                }
            }
        }

        if (this.el.dataset.defletido === "true") {
            let inimigos = document.querySelectorAll('[sistema-inimigo-sync]');
            for(let i=0; i<inimigos.length; i++) {
                let ini = inimigos[i]; let sync = ini.components['sistema-inimigo-sync'];
                if(sync && sync.hpAtual > 0) {
                    let posIni = new THREE.Vector3(); ini.object3D.getWorldPosition(posIni);
                    if (posProj.distanceTo(posIni) < 1.5) { sync.receberDano(this.data.dano * 2, 'Luva'); this.el.remove(); return; }
                }
            }
            return; 
        }
        
        if(!this.camera) return; let posPlayer = new THREE.Vector3(); this.camera.object3D.getWorldPosition(posPlayer); 
        if (posProj.distanceTo(posPlayer) < 0.3) { window.receberDanoJogador(this.data.dano); this.el.remove(); }
    }
});

AFRAME.registerComponent('projetil-magia', {
    schema: { velocidade: {type: 'vec3'}, dano: {type: 'number', default: 15}, armaOriginal: {type: 'string', default: 'Varinha'} },
    init: function () { 
        this.vel = new THREE.Vector3(this.data.velocidade.x, this.data.velocidade.y, this.data.velocidade.z); this.ativo = true;
        setTimeout(() => { if (this.el && this.el.parentNode) this.el.parentNode.removeChild(this.el); }, 3000);
    },
    tick: function (time, timeDelta) {
        if (!this.ativo) return; let dt = timeDelta / 1000; if (dt === 0) return;
        this.el.object3D.position.add(this.vel.clone().multiplyScalar(dt)); 
        
        let inimigosAtuais = document.querySelectorAll('[sistema-inimigo-sync]');
        for (let i = 0; i < inimigosAtuais.length; i++) {
            let inimigo = inimigosAtuais[i]; let syncComp = inimigo.components['sistema-inimigo-sync']; if (!syncComp || syncComp.hpAtual <= 0) continue;
            this.el.object3D.updateMatrixWorld(true); inimigo.object3D.updateMatrixWorld(true);
            let boxProj = new THREE.Box3().setFromObject(this.el.object3D); let boxInimigo = new THREE.Box3(); let colisorNode = inimigo.querySelector('.colisao-inimigo');
            if(colisorNode) { colisorNode.object3D.updateMatrixWorld(true); boxInimigo.setFromObject(colisorNode.object3D); } else { boxInimigo.setFromObject(inimigo.object3D); }
            
            if (boxProj.intersectsBox(boxInimigo)) { 
                syncComp.receberDano(this.data.dano, 'Varinha'); 
                let posInimigoHit = new THREE.Vector3(); inimigo.object3D.getWorldPosition(posInimigoHit); posInimigoHit.y += 1.0;
                window.gerarHitVFX(posInimigoHit, window.bancoDeArmas[this.data.armaOriginal] || window.bancoDeArmas['Varinha']);
                if(this.el.parentNode) this.el.parentNode.removeChild(this.el); 
                break; 
            }
        }
    }
});

AFRAME.registerComponent('vr-magia-lancar', {
    init: function() {
        this.gravando = false; this.tempoInicio = 0; this.scene = document.querySelector('a-scene');

        this.el.addEventListener('triggerdown', () => {
            if (window.GAME_MODE !== 'VR' || !window.playerState.vivo) return;
            let armaStats = window.bancoDeArmas[window.playerState.armaEquipada];
            if (!armaStats || armaStats.categoria !== 'Varinha') return;

            if (window.playerState.mpAtual < 10) { window.tocarSom('snd-hit'); return; }

            this.gravando = true; this.posInicio = new THREE.Vector3(0, 0, -0.45); this.posInicio.applyMatrix4(this.el.object3D.matrixWorld); this.tempoInicio = Date.now();
            const tipVisEl = this.el.querySelector('#wand-tip-vis'); if (tipVisEl) { tipVisEl.setAttribute('material', 'emissive: #fff; emissiveIntensity: 1.5'); }
        });

        this.el.addEventListener('triggerup', () => {
            if (!this.gravando) return; this.gravando = false;
            const tipVisEl = this.el.querySelector('#wand-tip-vis'); if (tipVisEl) { tipVisEl.setAttribute('material', 'emissive: #00FFFF; emissiveIntensity: 0.8'); }
            
            let posFim = new THREE.Vector3(0, 0, -0.45); posFim.applyMatrix4(this.el.object3D.matrixWorld);
            let tempoGasto = Date.now() - this.tempoInicio; let deltaWorld = new THREE.Vector3().subVectors(posFim, this.posInicio);
            
            if (tempoGasto > 50 && deltaWorld.length() > 0.15) {
                let cam = document.querySelector('[camera]'); let deltaMatrix = new THREE.Matrix4().copy(cam.object3D.matrixWorld).invert();
                let localInicio = this.posInicio.clone().applyMatrix4(deltaMatrix); let localFim = posFim.clone().applyMatrix4(deltaMatrix);
                let localDelta = new THREE.Vector3().subVectors(localFim, localInicio);
                let isHorizontal = Math.abs(localDelta.x) > Math.abs(localDelta.y);
                
                let corMagia, custoMP, multDano, scaleMagia;
                if (isHorizontal) { corMagia = '#9b59b6'; custoMP = 10; multDano = 1.0; scaleMagia = '1 1 1'; } else { corMagia = '#00FFFF'; custoMP = 15; multDano = 1.5; scaleMagia = '1.5 1.5 1.5'; }

                if (window.playerState.mpAtual < custoMP) { window.tocarSom('snd-hit'); return; }
                window.playerState.mpAtual -= custoMP; window.atualizarUI();

                let quatMao = new THREE.Quaternion(); this.el.object3D.getWorldQuaternion(quatMao);
                let castDir = new THREE.Vector3(0, 0, -1); castDir.applyQuaternion(quatMao).normalize();

                let bestTarget = null; let smallestAngle = 0.35; let inimigosAtuais = document.querySelectorAll('[sistema-inimigo-sync]');
                inimigosAtuais.forEach(ini => {
                    let syncComp = ini.components['sistema-inimigo-sync'];
                    if(syncComp && syncComp.hpAtual > 0) {
                        let iniPos = new THREE.Vector3(); ini.object3D.getWorldPosition(iniPos); iniPos.y += 1.0; 
                        let dirToIni = new THREE.Vector3().subVectors(iniPos, posFim).normalize();
                        let angle = castDir.angleTo(dirToIni);
                        if (angle < smallestAngle) { smallestAngle = angle; bestTarget = dirToIni; }
                    }
                });
                if (bestTarget) { castDir.lerp(bestTarget, 0.85).normalize(); } 

                let armaStats = window.bancoDeArmas[window.playerState.armaEquipada]; let speed = armaStats.projetilVel || 20; let finalVel = castDir.multiplyScalar(speed);
                let proj = document.createElement('a-entity'); proj.setAttribute('position', `${posFim.x} ${posFim.y} ${posFim.z}`); proj.setAttribute('scale', armaStats.projetilEscala || scaleMagia);
                
                if (armaStats.projetilGlb && armaStats.projetilGlb.trim() !== '') {
                    let glbPath = armaStats.projetilGlb.startsWith('#') ? armaStats.projetilGlb : `url(${armaStats.projetilGlb})`;
                    proj.innerHTML = `<a-entity gltf-model="${glbPath}" rotation="0 0 0" anti-piscar></a-entity>`;
                    proj.object3D.lookAt(posFim.clone().add(castDir));
                } else {
                    proj.innerHTML = `<a-sphere radius="0.1" color="${corMagia}" material="emissive: ${corMagia}; emissiveIntensity: 1"></a-sphere><a-light type="point" color="${corMagia}" intensity="0.5" distance="3"></a-light>`;
                }

                let danoFinal = Math.floor((window.playerState.forca + (armaStats.danoBonus || 10)) * multDano);
                proj.setAttribute('projetil-magia', `velocidade: ${finalVel.x} ${finalVel.y} ${finalVel.z}; dano: ${danoFinal}; armaOriginal: ${window.playerState.armaEquipada}`);
                if(this.scene) this.scene.appendChild(proj); window.tocarSom('snd-magic');
            }
        });
    }
});

AFRAME.registerComponent('projetil-fisico', {
    schema: { velocidade: {type: 'vec3'}, dano: {type: 'number', default: 10}, armaOriginal: {type: 'string', default: 'Shuriken'} },
    init: function () { this.gravidade = new THREE.Vector3(0, -2.0, 0); this.vel = new THREE.Vector3(this.data.velocidade.x, this.data.velocidade.y, this.data.velocidade.z); this.ativo = true; },
    tick: function (time, timeDelta) {
        if (!this.ativo) return; let dt = timeDelta / 1000; if (dt === 0) return;
        this.vel.add(this.gravidade.clone().multiplyScalar(dt)); this.el.object3D.position.add(this.vel.clone().multiplyScalar(dt)); this.el.object3D.rotation.y += 15 * dt;

        if (this.el.object3D.position.y < 0.05) { 
            this.el.object3D.position.y = 0.05; this.ativo = false; this.el.classList.add('shuriken-chao'); 
            setTimeout(() => { if (this.el && this.el.parentNode) this.el.parentNode.removeChild(this.el); }, 8000); return; 
        }
        
        let inimigosAtuais = document.querySelectorAll('[sistema-inimigo-sync]');
        for (let i = 0; i < inimigosAtuais.length; i++) {
            let inimigo = inimigosAtuais[i]; let syncComp = inimigo.components['sistema-inimigo-sync']; if (!syncComp || syncComp.hpAtual <= 0) continue;
            this.el.object3D.updateMatrixWorld(true); inimigo.object3D.updateMatrixWorld(true);
            let boxProj = new THREE.Box3().setFromObject(this.el.object3D); let boxInimigo = new THREE.Box3(); let colisorNode = inimigo.querySelector('.colisao-inimigo');
            if(colisorNode) { colisorNode.object3D.updateMatrixWorld(true); boxInimigo.setFromObject(colisorNode.object3D); } else { boxInimigo.setFromObject(inimigo.object3D); }
            
            if (boxProj.intersectsBox(boxInimigo)) { 
                syncComp.receberDano(this.data.dano, 'Arco'); 
                let posInimigoHit = new THREE.Vector3(); inimigo.object3D.getWorldPosition(posInimigoHit); posInimigoHit.y += 1.0;
                window.gerarHitVFX(posInimigoHit, window.bancoDeArmas[this.data.armaOriginal] || window.bancoDeArmas['Shuriken']);
                if(this.el.parentNode) this.el.parentNode.removeChild(this.el); break; 
            }
        }
    }
});

AFRAME.registerComponent('sync-cintura', {
    init: function() {
        this.visualDir = document.createElement('a-entity'); this.visualDir.innerHTML = window.bancoDeArmas['Shuriken'].visualDir;
        this.visualDir.setAttribute('position', '0.25 -0.1 0.1'); this.visualDir.setAttribute('scale', '0.8 0.8 0.8'); this.el.appendChild(this.visualDir);
    },
    tick: function() {
        let cam = document.querySelector('[camera]');
        if (cam) {
            let pos = cam.object3D.position; let euler = new THREE.Euler().setFromQuaternion(cam.object3D.quaternion, 'YXZ');
            this.el.object3D.position.set(pos.x, pos.y - 0.6, pos.z); this.el.object3D.rotation.set(0, euler.y, 0);
        }
        if (window.playerState.shurikens > 0) { this.visualDir.setAttribute('visible', 'true'); } else { this.visualDir.setAttribute('visible', 'false'); }
    }
});

AFRAME.registerComponent('vr-shuriken-lancar', {
    init: function() {
        this.segurando = false; this.posHistory = []; this.origemGrab = null; this.scene = document.querySelector('a-scene');

        this.el.addEventListener('gripdown', () => {
            if (window.GAME_MODE !== 'VR' || !window.playerState.vivo) return;
            let posMao = new THREE.Vector3(); this.el.object3D.getWorldPosition(posMao);
            
            let shurikensChao = document.querySelectorAll('.shuriken-chao'); let pegouChao = false;
            for(let i=0; i<shurikensChao.length; i++) {
                let sChao = shurikensChao[i]; let posS = new THREE.Vector3(); sChao.object3D.getWorldPosition(posS);
                if (posMao.distanceTo(posS) < 0.4) { this.origemGrab = sChao; sChao.parentNode.removeChild(sChao); pegouChao = true; break; }
            }

            let pegouCinto = false;
            if (!pegouChao && window.playerState.shurikens > 0) {
                let cintura = document.querySelector('#cintura-player');
                if (cintura) {
                    let posCintura = new THREE.Vector3(); cintura.object3D.getWorldPosition(posCintura);
                    let offsetDir = new THREE.Vector3(0.25, -0.1, 0.1); offsetDir.applyQuaternion(cintura.object3D.quaternion); posCintura.add(offsetDir);
                    if (posMao.distanceTo(posCintura) < 0.35) { this.origemGrab = 'cinto'; pegouCinto = true; }
                }
            }

            if (pegouChao || pegouCinto) {
                this.segurando = true; window.tocarSom('snd-magic'); 
                if(!this.visualInHand) {
                    this.visualInHand = document.createElement('a-entity'); this.visualInHand.innerHTML = window.bancoDeArmas['Shuriken'].visualDir; this.el.appendChild(this.visualInHand);
                }
                this.visualInHand.setAttribute('visible', 'true');
                let armaVis = this.el.querySelector(this.el.id === 'mao-direita' ? '#arma-visual-dir' : '#arma-visual-esq'); if(armaVis) armaVis.setAttribute('visible', 'false');
            }
        });

        this.el.addEventListener('gripup', () => {
            if (this.segurando) {
                this.segurando = false; if (this.visualInHand) this.visualInHand.setAttribute('visible', 'false');
                let armaVis = this.el.querySelector(this.el.id === 'mao-direita' ? '#arma-visual-dir' : '#arma-visual-esq'); if(armaVis) armaVis.setAttribute('visible', 'true');

                if (this.origemGrab === 'cinto') { window.playerState.shurikens--; window.atualizarUI(); }

                let vel = new THREE.Vector3(0,0,0);
                if (this.posHistory.length > 2) {
                    let oldData = this.posHistory[0]; let currPos = new THREE.Vector3(); this.el.object3D.getWorldPosition(currPos);
                    let dt = (Date.now() - oldData.time) / 1000; if (dt > 0) vel.subVectors(currPos, oldData.pos).divideScalar(dt);
                }
                
                let speed = vel.length(); let currPos = new THREE.Vector3(); this.el.object3D.getWorldPosition(currPos);
                
                if (speed > 1.5) {
                    vel.multiplyScalar(2.5); 
                    let bestTarget = null; let smallestAngle = 0.3; let inimigosAtuais = document.querySelectorAll('[sistema-inimigo-sync]');
                    inimigosAtuais.forEach(ini => {
                        let syncComp = ini.components['sistema-inimigo-sync'];
                        if(syncComp && syncComp.hpAtual > 0) {
                            let iniPos = new THREE.Vector3(); ini.object3D.getWorldPosition(iniPos); iniPos.y += 1.0; 
                            let dirMao = vel.clone().normalize(); let dirToIni = new THREE.Vector3().subVectors(iniPos, currPos).normalize();
                            let angle = dirMao.angleTo(dirToIni); if (angle < smallestAngle) { smallestAngle = angle; bestTarget = dirToIni; }
                        }
                    });
                    if (bestTarget) { let forcaReal = vel.length(); let dirAtual = vel.normalize(); dirAtual.lerp(bestTarget, 0.35).normalize(); vel = dirAtual.multiplyScalar(forcaReal); }
                } else { vel.set(0, 0, 0); }

                let proj = document.createElement('a-entity'); proj.setAttribute('position', `${currPos.x} ${currPos.y} ${currPos.z}`);
                let projVis = document.createElement('a-entity'); projVis.innerHTML = window.bancoDeArmas['Shuriken'].visualDir; proj.appendChild(projVis);

                let armaStats = window.bancoDeArmas['Shuriken']; let danoTiro = window.playerState.forca + (armaStats.danoBonus || 5);
                proj.setAttribute('projetil-fisico', `velocidade: ${vel.x} ${vel.y} ${vel.z}; dano: ${danoTiro}; armaOriginal: Shuriken`);
                if(this.scene) this.scene.appendChild(proj); if (speed > 1.5) window.tocarSom('snd-sword');
                this.origemGrab = null;
            }
        });
    },
    tick: function() {
        let pos = new THREE.Vector3(); this.el.object3D.getWorldPosition(pos); this.posHistory.push({pos: pos, time: Date.now()});
        if (this.posHistory.length > 6) this.posHistory.shift(); 
    }
});

AFRAME.registerComponent('vr-controles-left', { init: function () { this.el.addEventListener('xbuttondown', () => { window.toggleMenu('inv'); }); this.el.addEventListener('ybuttondown', () => { window.toggleMenu('atrib'); }); this.el.addEventListener('menudown', () => { window.toggleMenu('sys'); }); } });
AFRAME.registerComponent('vr-controles-right', { init: function () { this.el.addEventListener('abuttondown', () => { window.toggleMenu('sys'); }); this.el.addEventListener('bbuttondown', () => { window.toggleMenu('sys'); }); } });
AFRAME.registerComponent('anti-piscar', { init: function() { this.el.addEventListener('model-loaded', () => { const obj = this.el.getObject3D('mesh'); if (obj) { obj.traverse((node) => { if (node.isMesh) node.frustumCulled = false; }); } }); } });
AFRAME.registerComponent('btn-dialogo-fechar', { init: function() { this.el.addEventListener('mousedown', () => { window.fecharDialogoNPC(); }); this.el.addEventListener('touchstart', (e) => { e.preventDefault(); e.stopPropagation(); window.fecharDialogoNPC(); }, {passive: false}); } });
AFRAME.registerComponent('btn-dialogo-aceitar', { init: function() { this.el.addEventListener('mousedown', () => { window.aceitarMissaoNPC(); }); this.el.addEventListener('touchstart', (e) => { e.preventDefault(); e.stopPropagation(); window.aceitarMissaoNPC(); }, {passive: false}); } });

AFRAME.registerComponent('mobile-look', {
    schema: { sensitivity: { default: 0.004 } },
    init: function () {
        this.pitch = 0; this.yaw = 0; this.isDraggingCam = false; this.touchId = null; this.previousX = 0; this.previousY = 0;

        this.onTouchStart = (e) => {
            if (window.GAME_MODE !== 'ANDROID' || this.isDraggingCam || window.sysMenuAberto) return;
            for (let i = 0; i < e.changedTouches.length; i++) {
                if (e.changedTouches[i].target.tagName === 'CANVAS') { this.isDraggingCam = true; this.touchId = e.changedTouches[i].identifier; this.previousX = e.changedTouches[i].screenX; this.previousY = e.changedTouches[i].screenY; break; }
            }
        };

        this.onTouchMove = (e) => {
            if (!this.isDraggingCam || window.GAME_MODE !== 'ANDROID' || window.sysMenuAberto) return;
            let touch = null; for (let i = 0; i < e.touches.length; i++) { if (e.touches[i].identifier === this.touchId) { touch = e.touches[i]; break; } } if (!touch) return;
            let deltaX = touch.screenX - this.previousX; let deltaY = touch.screenY - this.previousY; this.previousX = touch.screenX; this.previousY = touch.screenY;
            this.yaw -= deltaX * this.data.sensitivity; this.pitch -= deltaY * this.data.sensitivity; this.pitch = Math.max(-Math.PI/2.2, Math.min(Math.PI/2.2, this.pitch));
            this.el.object3D.rotation.set(this.pitch, this.yaw, 0, 'YXZ');
        };

        this.onTouchEnd = (e) => {
            if (!this.isDraggingCam) return;
            for (let i = 0; i < e.changedTouches.length; i++) { if (e.changedTouches[i].identifier === this.touchId) { this.isDraggingCam = false; this.touchId = null; break; } }
        };

        window.addEventListener('touchstart', this.onTouchStart, {passive: false}); window.addEventListener('touchmove', this.onTouchMove, {passive: false}); window.addEventListener('touchend', this.onTouchEnd); window.addEventListener('touchcancel', this.onTouchEnd);
    }
});

AFRAME.registerComponent('mobile-movement', {
    tick: function(time, timeDelta) {
        if (!window.playerState.vivo || window.GAME_MODE !== 'ANDROID' || !window.GAME_STARTED || window.sysMenuAberto) return;
        let dt = timeDelta / 1000; let speed = 3.0 + (window.playerState.velocidade * 0.1); 
        if (Math.abs(window.joystickVector.x) > 0.1 || Math.abs(window.joystickVector.y) > 0.1) {
            let camEl = document.querySelector('[camera]'); let rigObj = this.el.object3D;
            let camWorldQuat = new THREE.Quaternion(); camEl.object3D.getWorldQuaternion(camWorldQuat); let euler = new THREE.Euler(0, 0, 0, 'YXZ').setFromQuaternion(camWorldQuat);
            let rotY = euler.y; let dirX = window.joystickVector.x; let dirZ = window.joystickVector.y; 
            let moveX = (dirX * Math.cos(rotY) + dirZ * Math.sin(rotY)) * speed * dt; let moveZ = (-dirX * Math.sin(rotY) + dirZ * Math.cos(rotY)) * speed * dt;
            rigObj.position.x += moveX; rigObj.position.z += moveZ;
        }
    }
});

AFRAME.registerComponent('slot-interativo', { 
    schema: { item: {type: 'string'} }, 
    init: function() { 
        let painelTooltip = document.querySelector('#inv-tooltip'); let txtNome = document.querySelector('#tt-nome'); let txtForca = document.querySelector('#tt-forca'); let txtDefesa = document.querySelector('#tt-defesa'); let boxEquipar = document.querySelector('#tt-acao'); 
        
        this.el.addEventListener('mouseenter', () => { 
            this.el.children[0].setAttribute('color', '#f1c40f'); let itemAlvo = window.bancoDeArmas[this.data.item]; let itemEquipado = window.bancoDeArmas[window.playerState.armaEquipada]; if(!itemAlvo) return; 
            let diffForca = itemAlvo.danoBonus - (itemEquipado ? itemEquipado.danoBonus : 0); let diffDefesa = itemAlvo.defesaBonus - (itemEquipado ? itemEquipado.defesaBonus : 0); 
            if(painelTooltip) painelTooltip.setAttribute('visible', 'true'); if(txtNome) txtNome.setAttribute('value', this.data.item); 
            if(txtForca) { txtForca.setAttribute('value', `ATK: ${itemAlvo.danoBonus}`); } 
            if(txtDefesa) { txtDefesa.setAttribute('value', `DEF: ${itemAlvo.defesaBonus}`); } 
            if(boxEquipar) { let msg = itemAlvo.categoria === 'Escudo' ? (window.playerState.nomeEscudo === this.data.item ? '[ EQUIPPED ]' : '[C] Equipar') : (window.playerState.armaEquipada === this.data.item ? '[ EQUIPPED ]' : '[C] Equipar'); let cor = (window.playerState.armaEquipada === this.data.item || window.playerState.nomeEscudo === this.data.item) ? '#f1c40f' : '#2ecc71'; boxEquipar.setAttribute('value', msg); boxEquipar.setAttribute('color', cor); } 
        }); 
        this.el.addEventListener('mouseleave', () => { this.el.children[0].setAttribute('color', '#151a21'); if(painelTooltip) painelTooltip.setAttribute('visible', 'false'); }); 
        
        const equiparFuncao = () => { 
            let itemAlvo = window.bancoDeArmas[this.data.item]; if(!itemAlvo) return;
            let armaAtual = window.bancoDeArmas[window.playerState.armaEquipada];
            
            if(itemAlvo.categoria === 'Escudo') { 
                if (armaAtual && (armaAtual.categoria === 'Arco' || armaAtual.categoria === 'Luva' || armaAtual.categoria === 'Varinha')) {
                    let aviso = document.querySelector('#texto-central'); if(aviso) { aviso.setAttribute('value', 'NÃO PODE USAR ESCUDO\nCOM ARMA DE 2 MÃOS!'); aviso.setAttribute('color', '#FF0000'); aviso.setAttribute('visible', 'true'); setTimeout(() => { if(aviso) aviso.setAttribute('visible', 'false'); }, 2000); }
                    return;
                }
                window.playerState.nomeEscudo = this.data.item; window.playerState.escudoEquipado = true; 
            } else { 
                if ((itemAlvo.categoria === 'Arco' || itemAlvo.categoria === 'Luva' || itemAlvo.categoria === 'Varinha') && window.playerState.escudoEquipado) {
                    window.playerState.escudoEquipado = false; window.playerState.nomeEscudo = '';
                }
                window.playerState.armaEquipada = this.data.item; 
            }
            
            window.atualizarUI(); let aviso = document.querySelector('#texto-central'); if(aviso) { aviso.setAttribute('value', `${this.data.item} Equipado!`); aviso.setAttribute('color', '#00FF00'); aviso.setAttribute('visible', 'true'); setTimeout(() => { if(aviso) aviso.setAttribute('visible', 'false'); }, 1000); } 
        };
        
        this.el.addEventListener('mousedown', equiparFuncao);
        this.el.addEventListener('touchstart', (e) => { e.preventDefault(); e.stopPropagation(); equiparFuncao(); }, {passive: false});
    } 
});

AFRAME.registerComponent('sistema-jogo', { init: function () { setInterval(() => { if (!window.GAME_STARTED) return; if (window.playerState.vivo && window.playerState.mpAtual < window.playerState.mpMax) { window.playerState.mpAtual = Math.min(window.playerState.mpMax, window.playerState.mpAtual + 5); window.atualizarUI(); } }, 1000); } });

AFRAME.registerComponent('btn-atributo', { 
    schema: { tipo: { type: 'string' } }, 
    init: function () { 
        const upFn = () => { 
            if (window.playerState.pontos > 0 && window.playerState.vivo) { 
                window.playerState.pontos--; window.playerState[this.data.tipo]++; this.el.setAttribute('color', '#fff'); 
                setTimeout(() => { if(this.el) this.el.setAttribute('color', this.data.tipo === 'forca' ? '#e74c3c' : (this.data.tipo === 'defesa' ? '#3498db' : '#f1c40f')); }, 150); 
                if (this.data.tipo === 'defesa') { window.playerState.hpMax += 10; window.playerState.hpAtual = window.playerState.hpMax; } 
                if (this.data.tipo === 'forca') { window.playerState.mpMax += 10; window.playerState.mpAtual = window.playerState.mpMax; } 
                window.atualizarUI(); 
            } 
        }; 
        this.el.addEventListener('mousedown', upFn); 
        this.el.addEventListener('touchstart', (e) => { e.preventDefault(); e.stopPropagation(); upFn(); }, {passive: false}); 
    } 
});

AFRAME.registerComponent('sistema-bau', { init: function() { let aberto = false; this.el.addEventListener('click', () => { if(!aberto) { aberto = true; this.el.setAttribute('color', '#8B4513'); this.el.setAttribute('rotation', '-45 45 0'); window.playerState.flechas += 15; window.playerState.shurikens += 15; window.playerState.ouro += 500; window.playerState.pontos += 3; window.atualizarUI(); let aviso = document.querySelector('#texto-central'); if(aviso) { aviso.setAttribute('value', '+15 Flechas\n+15 Shurikens\n+500 Ouro\n+3 Pontos!'); aviso.setAttribute('color', '#FFD700'); aviso.setAttribute('visible', 'true'); setTimeout(() => { if(aviso) aviso.setAttribute('visible', 'false'); }, 3000); } } }); } });

AFRAME.registerComponent('sistema-npc-interacao', {
    init: function() {
        this.tocarAnimacao = (nomeAnimacao) => {
            if(!nomeAnimacao) return; let visual = this.el.parentNode.querySelector('.modelo-visual');
            if (visual && visual.hasAttribute('gltf-model')) { visual.removeAttribute('animation-mixer'); setTimeout(() => { if(visual && visual.parentNode) visual.setAttribute('animation-mixer', `clip: ${nomeAnimacao}; loop: repeat; crossFadeDuration: 0.2`); }, 20); }
        };

        this.el.parentNode.addEventListener('model-loaded', () => { if(this.el.npcData && this.el.npcData.animParado) this.tocarAnimacao(this.el.npcData.animParado); });
        this.el.addEventListener('mouseenter', () => { let tag = this.el.parentNode.querySelector('.npc-nome-tag'); if(tag) tag.setAttribute('color', '#00ffcc'); });
        this.el.addEventListener('mouseleave', () => { let tag = this.el.parentNode.querySelector('.npc-nome-tag'); if(tag) tag.setAttribute('color', '#f1c40f'); });

        this.el.addEventListener('click', () => {
            if (!window.GAME_STARTED || !window.playerState.vivo) return;
            let cameraObj = document.querySelector('[camera]'); if(!cameraObj) return; let posPlayer = new THREE.Vector3(); cameraObj.object3D.getWorldPosition(posPlayer); let posNPC = new THREE.Vector3(); this.el.parentNode.object3D.getWorldPosition(posNPC);
            let dist2D = Math.hypot(posPlayer.x - posNPC.x, posPlayer.z - posNPC.z); if (dist2D > 5.0) return; 
            let data = this.el.npcData; if (!data) return;
            if (data.animFalando) { this.tocarAnimacao(data.animFalando); setTimeout(() => { if(data.animParado) this.tocarAnimacao(data.animParado); }, 8000); }
            window.abrirDialogoNPC(data);
        });
    }
});