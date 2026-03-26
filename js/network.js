// ==========================================
// FIREBASE NETWORK, MULTIPLAYER E INIMIGOS
// ==========================================

AFRAME.registerComponent('firebase-multiplayer', {
    init: function() {
        this.db = realtimeDB; this.playersRef = this.db.ref('players'); this.myId = 'player_' + Math.random().toString(36).substr(2, 9); 
        window.meuIdMultiplayer = this.myId; 
        
        this.myRef = this.db.ref('players/' + this.myId); this.myRef.onDisconnect().remove(); this.otherPlayers = {}; this.cena = document.querySelector('a-scene'); this.lastPosRot = "";
        this.lastIAHeartbeat = 0; this.db.ref('servidor_ia_status').on('value', snap => { this.lastIAHeartbeat = snap.val() || 0; });

        this.playersRef.on('child_added', (snapshot) => {
            let id = snapshot.key; if (id === this.myId) return; let data = snapshot.val(); let avatar = document.createElement('a-entity'); this.cena.appendChild(avatar); 
            let pX = data.position ? data.position.x || 0 : 0; let pY = data.position ? data.position.y || 0 : 0; let pZ = data.position ? data.position.z || 0 : 0;
            avatar.setAttribute('position', `${pX} ${pY} ${pZ}`); 
            let rX = data.rotation ? data.rotation.x || 0 : 0; let rY = data.rotation ? data.rotation.y || 0 : 0; let rZ = data.rotation ? data.rotation.z || 0 : 0;
            avatar.setAttribute('rotation', `${rX} ${rY} ${rZ}`);
            avatar.dataset.vivo = data.vivo !== false ? "true" : "false"; avatar.setAttribute('visible', data.vivo !== false ? 'true' : 'false');
            
            let pCabeloCor = data.visual && data.visual.corCabelo ? data.visual.corCabelo : '#f1c40f';
            let pPeleCor = data.visual && data.visual.corPele ? data.visual.corPele : '#ffcd94';
            let pNome = data.nome || "Aliado";

            let conteudoAvatar = `
                <a-box scale="0.3 0.3 0.3" color="${pCabeloCor}" position="0 0.5 0">
                    <a-box color="#222" scale="0.1 0.1 0.05" position="-0.3 0.2 -0.51"></a-box>
                    <a-box color="#222" scale="0.1 0.1 0.05" position="0.3 0.2 -0.51"></a-box>
                    <a-plane width="1" height="1" position="0 0 -0.5" color="${pPeleCor}"></a-plane>
                </a-box>
                <a-cylinder radius="0.25" height="0.6" color="#2980b9" position="0 0.0 0"></a-cylinder>
                <a-text value="${pNome}" align="center" position="0 0.9 0" color="white" scale="0.6 0.6 0.6" side="double"></a-text>
            `;
            avatar.innerHTML = conteudoAvatar; this.otherPlayers[id] = avatar;
        });

        this.playersRef.on('child_changed', (snapshot) => {
            let id = snapshot.key; if (id === this.myId) return; let avatar = this.otherPlayers[id]; let data = snapshot.val();
            if (avatar && data && data.position) { avatar.dataset.vivo = data.vivo !== false ? "true" : "false"; avatar.setAttribute('visible', data.vivo !== false ? 'true' : 'false'); avatar.setAttribute('animation__pos', `property: position; to: ${data.position.x || 0} ${data.position.y || 0} ${data.position.z || 0}; dur: 100; easing: linear`); avatar.setAttribute('animation__rot', `property: rotation; to: ${data.rotation.x || 0} ${data.rotation.y || 0} ${data.rotation.z || 0}; dur: 100; easing: linear`); }
        });

        this.playersRef.on('child_removed', (snapshot) => { let id = snapshot.key; let avatar = this.otherPlayers[id]; if (avatar && avatar.parentNode) { avatar.parentNode.removeChild(avatar); delete this.otherPlayers[id]; } });
        this.lastSyncTime = 0; this.cameraObj = document.querySelector('[camera]');
        
        setInterval(() => {
            let textEl = document.querySelector('#contador-online');
            if (textEl) {
                let totalPlayers = Object.keys(this.otherPlayers).length + 1; let iaAcordada = (Date.now() - this.lastIAHeartbeat) < 5000;
                if (iaAcordada) { textEl.setAttribute('value', `Jogadores: ${totalPlayers} | IA: ONLINE`); textEl.setAttribute('color', '#00FF00'); } 
                else { textEl.setAttribute('value', `Jogadores: ${totalPlayers} | IA: LIGANDO...`); textEl.setAttribute('color', '#f1c40f'); }
            }
        }, 1000);
    },
    tick: function(time) {
        if (!window.GAME_STARTED || !window.playerState.vivo || !this.cameraObj) return; 
        if (time - this.lastSyncTime > 100) { 
            this.lastSyncTime = time; let pos = this.el.object3D.position; 
            let euler = new THREE.Euler(0, 0, 0, 'YXZ'); euler.setFromQuaternion(this.cameraObj.object3D.quaternion); let rotY = euler.y * 180 / Math.PI;
            let currentPosRot = pos.x.toFixed(2) + pos.y.toFixed(2) + pos.z.toFixed(2) + rotY.toFixed(2);
            if (this.lastPosRot !== currentPosRot) { window.lastActionTime = Date.now(); this.lastPosRot = currentPosRot; }
            this.myRef.set({ position: { x: Number(pos.x.toFixed(3)), y: Number(pos.y.toFixed(3)), z: Number(pos.z.toFixed(3)) }, rotation: { x: 0, y: Number(rotY.toFixed(3)), z: 0 }, vivo: window.playerState.vivo, visual: window.playerState.visual, nome: window.playerState.nome }); 
        }
    }
});

AFRAME.registerComponent('gerenciador-respawns', {
    init: function() {
        this.db = realtimeDB; this.respawns = {};
        this.db.ref('cenario_respawns').on('child_added', (snap) => { let id = snap.key; let r = snap.val(); this.respawns[id] = r; let el = document.createElement('a-entity'); this.el.appendChild(el); el.dataset.respId = id; el.setAttribute('position', `${r.pos.x} ${r.pos.y} ${r.pos.z}`); let rRaio = r.raio || 3; el.innerHTML = `<a-octahedron color="#00ffcc" radius="0.3" position="0 1 0" material="emissive: #00ffcc; emissiveIntensity: 0.5" animation="property: rotation; to: 0 360 0; loop: true; dur: 4000; easing: linear" animation__up="property: position; to: 0 1.2 0; loop: true; dir: alternate; dur: 2000"></a-octahedron><a-cylinder color="#00ffcc" radius="${rRaio}" height="0.05" position="0 0.02 0" opacity="0.2" material="transparent: true"></a-cylinder>`; });
        this.db.ref('cenario_respawns').on('child_changed', (snap) => { let id = snap.key; let r = snap.val(); this.respawns[id] = r; let el = document.querySelector(`[data-resp-id="${id}"]`); if(el) { el.setAttribute('position', `${r.pos.x} ${r.pos.y} ${r.pos.z}`); let cyl = el.querySelector('a-cylinder'); if(cyl) cyl.setAttribute('radius', r.raio || 3); } });
        this.db.ref('cenario_respawns').on('child_removed', (snap) => { delete this.respawns[snap.key]; let el = document.querySelector(`[data-resp-id="${snap.key}"]`); if(el && el.parentNode) el.parentNode.removeChild(el); });
    },
    tick: function() {
        if (!window.GAME_STARTED || !window.playerState.vivo) return; let camObj = document.querySelector('[camera]'); if (!camObj) return; let pPos = new THREE.Vector3(); camObj.object3D.getWorldPosition(pPos);
        for (let id in this.respawns) { let r = this.respawns[id]; let raio = r.raio || 3; let dist = Math.hypot(pPos.x - r.pos.x, pPos.z - r.pos.z);
            if (dist <= raio) { if (!window.playerState.ultimoRespawn || window.playerState.ultimoRespawn.id !== id) { window.playerState.ultimoRespawn = { id: id, x: r.pos.x, y: r.pos.y, z: r.pos.z }; window.salvarJogoNuvem(); let aviso = document.querySelector('#texto-central'); if(aviso) { aviso.setAttribute('value', 'CHECKPOINT SALVO!'); aviso.setAttribute('color', '#00ffcc'); aviso.setAttribute('visible', 'true'); window.tocarSom('snd-magic'); setTimeout(() => { if (aviso) aviso.setAttribute('visible', 'false'); }, 2500); } } }
        }
    }
});

AFRAME.registerComponent('sistema-inimigo-sync', { 
    schema: { idBd: { type: 'string' }, hpMax: { type: 'number', default: 50 }, xpDrop: { type: 'number', default: 50 }, tipo: { type: 'string', default: 'atirador'} }, 
    tocarAnimacao: function(nomePadrao, loopState, clamp = false) { 
        if (!nomePadrao) return; let visual = this.el.querySelector('.modelo-visual');
        if (visual && visual.hasAttribute('gltf-model')) { 
            let nomeAnimacaoFinal = nomePadrao;
            if (this.dadosBD) { if (nomePadrao === window.ANIM_PARADO && this.dadosBD.animParado) nomeAnimacaoFinal = this.dadosBD.animParado; if (nomePadrao === window.ANIM_ANDANDO && this.dadosBD.animAndando) nomeAnimacaoFinal = this.dadosBD.animAndando; if (nomePadrao === window.ANIM_ATIRANDO && this.dadosBD.animAtaque) nomeAnimacaoFinal = this.dadosBD.animAtaque; if (nomePadrao === window.ANIM_MORTE && this.dadosBD.animMorte) nomeAnimacaoFinal = this.dadosBD.animMorte; }
            if (this.animacaoAtual !== nomeAnimacaoFinal) { this.animacaoAtual = nomeAnimacaoFinal; visual.removeAttribute('animation-mixer'); setTimeout(() => { if(visual && visual.parentNode) { visual.setAttribute('animation-mixer', `clip: ${nomeAnimacaoFinal}; loop: ${loopState}; crossFadeDuration: 0.2; clampWhenFinished: ${clamp}`); } }, 20); }
        }
    },
    init: function () { 
        this.hpAtual = this.data.hpMax; this.el.classList.add('interativo'); this.targetPos = new THREE.Vector3(); this.targetRotY = 0; this.isMoving = false; this.isAttacking = false; this.animacaoAtual = ""; this.isDead = false;
        this.el.addEventListener('model-loaded', () => { if (!this.isDead) this.tocarAnimacao(window.ANIM_PARADO, 'repeat'); });
        this.dbRef = realtimeDB.ref('cenario_inimigos/' + this.data.idBd); this.ultimoTempoTiro = 0; this.ultimoTempoMelee = 0; this.dadosBD = null;

        this.dbRef.on('value', snap => {
            if (!this.el || !this.el.parentNode) return; let data = snap.val(); if (!data) return; this.dadosBD = data; let textoHp = this.el.querySelector('.hp-texto');
            if (data.pos) { let pX = isNaN(data.pos.x) ? 0 : data.pos.x; let pY = isNaN(data.pos.y) ? 0 : data.pos.y; let pZ = isNaN(data.pos.z) ? 0 : data.pos.z; this.targetPos.set(pX, pY, pZ); this.targetRotY = isNaN(data.rotY) ? 0 : data.rotY; }

            if (data.hp > 0 && data.meleeAttack && data.meleeAttack.time !== this.ultimoTempoMelee) {
                this.ultimoTempoMelee = data.meleeAttack.time; this.isAttacking = true; this.tocarAnimacao(window.ANIM_ATIRANDO, 'once');
                
                // ATRASO DE 400ms PARA SINCRONIZAR COM O CORTE DA ESPADA DO INIMIGO
                setTimeout(() => {
                    if (this.hpAtual <= 0) return; 

                    if (window.playerState.vivo && !window.playerState.invulneravel) {
                        let camEl = document.querySelector('[camera]'); 
                        if(camEl) { 
                            camEl.object3D.updateMatrixWorld(true); 
                            let posPlayer = new THREE.Vector3(); 
                            camEl.object3D.getWorldPosition(posPlayer); 
                            
                            let posAtaque = new THREE.Vector3();
                            let achouOsso = false;
                            
                            // BUSCA O OSSO DA ARMA DENTRO DO GLB
                            let visual = this.el.querySelector('.modelo-visual');
                            if (visual) {
                                let mesh = visual.getObject3D('mesh');
                                if (mesh) {
                                    mesh.traverse((node) => {
                                        if (!achouOsso && node.isBone) {
                                            let nName = node.name.toLowerCase();
                                            if (nName.includes('hand_r') || nName.includes('righthand') || nName.includes('weapon') || nName.includes('espada') || nName.includes('sword') || nName.includes('arma')) {
                                                node.getWorldPosition(posAtaque);
                                                achouOsso = true;
                                            }
                                        }
                                    });
                                }
                            }
                            
                            // SE NÃO ACHOU O OSSO, PROJETA O ATAQUE 1 METRO PARA FRENTE
                            if (!achouOsso) {
                                this.el.object3D.getWorldPosition(posAtaque);
                                let dirFrente = new THREE.Vector3(0, 0, 1).applyQuaternion(this.el.object3D.quaternion);
                                posAtaque.add(dirFrente.multiplyScalar(1.0));
                            }

                            let alcanceHit = data.attackRange !== undefined ? data.attackRange : 2.0; 
                            
                            // IGNORA A ALTURA NO CÁLCULO PARA EVITAR QUE O JOGADOR DE VR DESVIE SÓ ABAIXANDO A CABEÇA UM POUCO
                            let dist2D = Math.hypot(posPlayer.x - posAtaque.x, posPlayer.z - posAtaque.z); 
                            
                            if (dist2D <= alcanceHit) { 
                                let forcaMonstro = data.dano !== undefined ? data.dano : 10; 
                                window.receberDanoJogador(forcaMonstro); 
                            } 
                        }
                    }
                }, 400);

                setTimeout(() => { this.isAttacking = false; if (this.hpAtual > 0) this.tocarAnimacao(this.isMoving ? window.ANIM_ANDANDO : window.ANIM_PARADO, 'repeat'); }, 1000);
            }

            if (data.hp > 0 && data.shoot && data.shoot.time !== this.ultimoTempoTiro) {
                this.ultimoTempoTiro = data.shoot.time; this.isAttacking = true; this.tocarAnimacao(window.ANIM_ATIRANDO, 'once');
                setTimeout(() => { this.isAttacking = false; if (this.hpAtual > 0) this.tocarAnimacao(this.isMoving ? window.ANIM_ANDANDO : window.ANIM_PARADO, 'repeat'); }, 1000);
                let proj = document.createElement('a-entity'); let posInimigo = new THREE.Vector3(); this.el.object3D.getWorldPosition(posInimigo); proj.setAttribute('position', `${posInimigo.x} ${posInimigo.y + 1.2} ${posInimigo.z}`);
                let tX = isNaN(data.shoot.tx) ? 0 : data.shoot.tx; let tY = isNaN(data.shoot.ty) ? 0 : data.shoot.ty; let tZ = isNaN(data.shoot.tz) ? 0 : data.shoot.tz; let targetVec = new THREE.Vector3(tX, tY, tZ);
                let dir = targetVec.sub(new THREE.Vector3(posInimigo.x, posInimigo.y + 1.2, posInimigo.z)).normalize(); let forcaTiro = data.dano !== undefined ? data.dano : 15;
                
                let velTiro = data.velocidadeTiro !== undefined ? data.velocidadeTiro : 6.0;
                proj.setAttribute('projetil-inimigo-fisico', `velocidade: ${dir.x * velTiro} ${dir.y * velTiro} ${dir.z * velTiro}; dano: ${forcaTiro}`); 
                
                let escalaTiro = data.escalaTiro || '0.5 0.5 0.5';
                let rotTiro = data.rotacaoTiro || '0 0 0';

                if (data.modeloTiroGlb && data.modeloTiroGlb.trim() !== '') {
                    let glbPath = data.modeloTiroGlb.startsWith('#') ? data.modeloTiroGlb : `url(${data.modeloTiroGlb})`;
                    proj.innerHTML = `<a-entity gltf-model="${glbPath}" scale="${escalaTiro}" rotation="${rotTiro}" anti-piscar></a-entity>`;
                } else {
                    proj.innerHTML = `<a-entity scale="${escalaTiro}" rotation="${rotTiro}"><a-sphere radius="0.15" color="#e74c3c" material="emissive: #e74c3c; emissiveIntensity: 1"></a-sphere></a-entity>`;
                }

                let scene = document.querySelector('a-scene'); if(scene) scene.appendChild(proj);
            }

            let estavaMorto = (this.hpAtual <= 0); let morreuAgora = (this.hpAtual > 0 && data.hp <= 0); let tomouDano = (this.hpAtual > 0 && data.hp > 0 && data.hp < this.hpAtual); let reviveu = (estavaMorto && data.hp > 0);
            this.hpAtual = data.hp;

            if (morreuAgora) {
                this.isDead = true; if(textoHp) textoHp.setAttribute('value', 'MORTO'); this.el.classList.remove('interativo'); this.tocarAnimacao(window.ANIM_MORTE, 'once', true); setTimeout(() => { if(this.hpAtual <= 0 && this.el) this.el.setAttribute('visible', 'false'); }, 3000);
            } else if (reviveu) {
                this.isDead = false; if(textoHp) { textoHp.setAttribute('value', `HP: ${this.hpAtual}`); textoHp.setAttribute('color', '#FFF'); } this.el.classList.add('interativo'); this.el.setAttribute('visible', 'true'); this.tocarAnimacao(window.ANIM_PARADO, 'repeat');
            } else if (tomouDano) {
                if(textoHp) textoHp.setAttribute('value', `HP: ${this.hpAtual}`); 
                let v = this.el.querySelector('.modelo-visual') || this.el.querySelector('.inimigo-fallback'); let obj3D = v ? v.getObject3D('mesh') : null;
                if (obj3D) obj3D.traverse((n) => { if (n.isMesh && n.material && n.material.emissive) { if (n.userData.corOriginal === undefined) { n.userData.corOriginal = n.material.emissive.getHex(); } n.material.emissive.setHex(0xaa0000); setTimeout(() => { if(n.material) n.material.emissive.setHex(n.userData.corOriginal); }, 150); } });
                if(!this.isAttacking && !this.isDead) { this.tocarAnimacao(window.ANIM_DANO, 'once'); setTimeout(() => { if (this.hpAtual > 0 && !this.isAttacking) this.tocarAnimacao(this.isMoving ? window.ANIM_ANDANDO : window.ANIM_PARADO, 'repeat'); }, 600); }
            } else if (!estavaMorto && data.hp > 0) { if(textoHp) textoHp.setAttribute('value', `HP: ${this.hpAtual}`); }
        });

        this.receberDano = (dano, tipoCategoria = '') => { 
            if (!window.playerState.vivo || this.hpAtual <= 0) return; 
            window.tocarSom('snd-hit'); 
            
            this.dbRef.child('hp').transaction(currentHp => { 
                let numHp = currentHp === null ? this.hpAtual : Number(currentHp); 
                if (isNaN(numHp) || numHp <= 0) return;
                return Math.max(0, numHp - dano); 
            }, (error, committed, snapshot) => {
                if (error) console.log("Erro no banco:", error);
                if (committed) {
                    let novoHp = snapshot.val();
                    this.dbRef.update({ ultimoAtacante: window.meuIdMultiplayer });

                    if (novoHp === 0) {
                        this.hpAtual = 0; 
                        window.playerState.xp += this.data.xpDrop; 
                        let textoHp = this.el.querySelector('.hp-texto'); 
                        if(textoHp) { textoHp.setAttribute('value', `+ ${this.data.xpDrop} XP!`); textoHp.setAttribute('color', '#00ff00'); }
                        this.el.classList.remove('interativo');
                        
                        if (window.playerState.xp >= window.playerState.xpProxNivel) { 
                            window.playerState.nivel++; window.playerState.pontos++; window.playerState.xp -= window.playerState.xpProxNivel; window.playerState.xpProxNivel = Math.floor(window.playerState.xpProxNivel * 1.5); 
                            let aviso = document.querySelector('#texto-central'); 
                            if(aviso) { aviso.setAttribute('value', 'LEVEL UP! (Aperte C/Y)'); aviso.setAttribute('color', '#00FF00'); aviso.setAttribute('visible', 'true'); setTimeout(() => { if(aviso) aviso.setAttribute('visible', 'false'); }, 4000); } 
                        } 
                        window.atualizarUI(); this.dbRef.update({ mortoEm: Date.now() }); 
                    }
                }
            });
        }; 
    },
    tick: function(time, timeDelta) {
        if (!this.targetPos || this.hpAtual <= 0 || this.isDead) return;
        let posAnterior = this.el.object3D.position.clone(); let distParaAlvo = this.el.object3D.position.distanceTo(this.targetPos);
        if (distParaAlvo > 0.01) { this.el.object3D.position.lerp(this.targetPos, 0.2); }
        let velocidadeAtual = this.el.object3D.position.distanceTo(posAnterior);
        if (velocidadeAtual > 0.002) { this.lastMoveTime = time; if (!this.isMoving && !this.isAttacking) { this.isMoving = true; this.tocarAnimacao(window.ANIM_ANDANDO, 'repeat'); } } 
        else { if (this.isMoving && !this.isAttacking && (time - this.lastMoveTime > 200)) { this.isMoving = false; this.tocarAnimacao(window.ANIM_PARADO, 'repeat'); } }
        let qTarget = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0,1,0), this.targetRotY); this.el.object3D.quaternion.slerp(qTarget, 0.2);
    }
});

AFRAME.registerComponent('gerenciador-inimigos', {
    init: function() {
        this.db = realtimeDB;
        this.db.ref('cenario_inimigos').on('child_added', (snapshot) => {
            let id = snapshot.key; let data = snapshot.val();
            if (!data || data.hp === undefined || data.hpMax === undefined || !data.modeloGlb) { return; }
            if (document.querySelector(`[data-id="${id}"]`)) return;

            let el = document.createElement('a-entity'); this.el.appendChild(el); el.dataset.id = id;
            let pX = data.pos && !isNaN(data.pos.x) ? data.pos.x : 0; let pY = data.pos && !isNaN(data.pos.y) ? data.pos.y : 0; let pZ = data.pos && !isNaN(data.pos.z) ? data.pos.z : 0;
            el.setAttribute('position', `${pX} ${pY} ${pZ}`);
            
            let xpDrop = data.tipo === 'atirador' ? 50 : 20; let escX = data.escala ? data.escala.x : 1; let escY = data.escala ? data.escala.y : 1; let escZ = data.escala ? data.escala.z : 1;
            el.setAttribute('sistema-inimigo-sync', `idBd: ${id}; hpMax: ${data.hpMax || 50}; tipo: ${data.tipo || 'meelee'}; xpDrop: ${xpDrop}`); el.setAttribute('shadow', '');

            let holograma = document.createElement('a-box'); el.appendChild(holograma); holograma.setAttribute('color', '#f1c40f'); holograma.setAttribute('opacity', '0.5'); holograma.setAttribute('scale', '0.6 1.8 0.6'); holograma.setAttribute('position', '0 0.9 0'); 
            let fallbackColor = data.tipo === 'atirador' ? '#e74c3c' : '#8e44ad'; let fallback = document.createElement('a-entity'); el.appendChild(fallback); fallback.innerHTML = `<a-box class="inimigo-fallback" color="${fallbackColor}" scale="0.5 1.5 0.5" position="0 0.75 0"></a-box>`; fallback.setAttribute('visible', 'false'); 

            let visual = document.createElement('a-entity'); el.appendChild(visual); visual.classList.add('modelo-visual'); visual.setAttribute('scale', `${escX} ${escY} ${escZ}`);
            let modelSrc = data.modeloGlb && data.modeloGlb.trim() !== '' ? data.modeloGlb : (data.tipo === 'atirador' ? '#modelo-inimigo' : '#modelo-inimigo2'); visual.dataset.currentModel = modelSrc;

            let infos = document.createElement('a-entity'); el.appendChild(infos); 
            infos.innerHTML = `<a-text class="hp-texto" value="HP: ${data.hp}" position="-0.4 2.2 0" color="#FFF" scale="0.8 0.8 0.8"></a-text>
                               <a-box class="colisao-inimigo" width="1.2" height="2.0" depth="1.2" position="0 1.0 0" opacity="0" scale="${escX} ${escY} ${escZ}"></a-box>`;

            if (modelSrc && modelSrc.trim() !== '') {
                let glbPath = modelSrc.startsWith('#') ? modelSrc : `url(${modelSrc})`;
                visual.setAttribute('gltf-model', glbPath); visual.setAttribute('anti-piscar', '');
                
                visual.addEventListener('model-loaded', () => { 
                    holograma.setAttribute('visible', 'false'); fallback.setAttribute('visible', 'false'); 
                    
                    let mesh = visual.getObject3D('mesh');
                    if(mesh) {
                        let bbox = new THREE.Box3().setFromObject(mesh);
                        let size = new THREE.Vector3(); bbox.getSize(size);
                        let center = new THREE.Vector3(); bbox.getCenter(center);
                        let colisor = el.querySelector('.colisao-inimigo');
                        if(colisor) {
                            colisor.setAttribute('width', Math.max(0.5, size.x / escX));
                            colisor.setAttribute('height', Math.max(1.0, size.y / escY));
                            colisor.setAttribute('depth', Math.max(0.5, size.z / escZ));
                            let localCenterY = (center.y - el.object3D.position.y) / escY;
                            colisor.setAttribute('position', `0 ${localCenterY} 0`);
                        }
                    }
                });
                visual.addEventListener('model-error', () => { holograma.setAttribute('color', '#e74c3c'); holograma.setAttribute('opacity', '0.8'); fallback.setAttribute('visible', 'true'); });
            }
        });

        this.db.ref('cenario_inimigos').on('child_changed', (snapshot) => {
            let id = snapshot.key; let data = snapshot.val(); if (!data || data.hp === undefined) return;
            let el = document.querySelector(`[data-id="${id}"]`);
            if (el) {
                let visual = el.querySelector('.modelo-visual');
                if (visual) {
                    let escX = data.escala ? data.escala.x : 1; let escY = data.escala ? data.escala.y : 1; let escZ = data.escala ? data.escala.z : 1; visual.setAttribute('scale', `${escX} ${escY} ${escZ}`);
                    let colisor = el.querySelector('.colisao-inimigo');
                    if(colisor) colisor.setAttribute('scale', `${escX} ${escY} ${escZ}`);
                    
                    let newModel = data.modeloGlb && data.modeloGlb.trim() !== '' ? data.modeloGlb : (data.tipo === 'atirador' ? '#modelo-inimigo' : '#modelo-inimigo2');
                    if (visual.dataset.currentModel !== newModel) { 
                        visual.dataset.currentModel = newModel; 
                        let glbPath = newModel.startsWith('#') ? newModel : `url(${newModel})`;
                        visual.setAttribute('gltf-model', glbPath); 
                        let holograma = el.querySelector('a-box[color="#f1c40f"], a-box[color="#e74c3c"]'); if(holograma) { holograma.setAttribute('visible', 'true'); holograma.setAttribute('color', '#f1c40f'); } 
                    }
                }
            }
        });

        this.db.ref('cenario_inimigos').on('child_removed', (snapshot) => { let el = document.querySelector(`[data-id="${snapshot.key}"]`); if (el && el.parentNode) { el.removeAttribute('sistema-inimigo-sync'); el.parentNode.removeChild(el); } });
    }
});

AFRAME.registerComponent('gerenciador-npcs', {
    init: function() {
        this.db = realtimeDB;
        this.db.ref('cenario_npcs').on('child_added', (snapshot) => {
            let id = snapshot.key; let data = snapshot.val();
            if (!data || document.querySelector(`[data-npc-id="${id}"]`)) return;

            let el = document.createElement('a-entity'); this.el.appendChild(el); el.dataset.npcId = id;
            if (data.pos) el.setAttribute('position', `${data.pos.x} ${data.pos.y} ${data.pos.z}`); el.setAttribute('shadow', '');
            
            let escX = data.escala ? data.escala.x : 1; let escY = data.escala ? data.escala.y : 1; let escZ = data.escala ? data.escala.z : 1; 

            let colisor = document.createElement('a-box'); el.appendChild(colisor);
            colisor.setAttribute('width', '1.0'); colisor.setAttribute('height', '2.5'); colisor.setAttribute('depth', '1.0'); colisor.setAttribute('position', '0 1.25 0'); colisor.setAttribute('opacity', '0'); colisor.classList.add('interativo'); colisor.npcData = data; colisor.setAttribute('sistema-npc-interacao', ''); 
            colisor.classList.add('colisao-inimigo'); 
            colisor.setAttribute('scale', `${escX} ${escY} ${escZ}`);

            let holograma = document.createElement('a-box'); el.appendChild(holograma); holograma.setAttribute('color', '#f1c40f'); holograma.setAttribute('opacity', '0.5'); holograma.setAttribute('scale', '0.6 1.8 0.6'); holograma.setAttribute('position', '0 0.9 0'); holograma.className = 'npc-holograma'; 
            let fallback = document.createElement('a-entity'); el.appendChild(fallback); fallback.innerHTML = `<a-cylinder color="#3498db" radius="0.3" height="1.6" position="0 0.8 0"></a-cylinder><a-sphere color="#f1c40f" radius="0.25" position="0 1.8 0"></a-sphere>`; 

            let visual = document.createElement('a-entity'); el.appendChild(visual); visual.classList.add('modelo-visual');
            visual.setAttribute('scale', `${escX} ${escY} ${escZ}`);

            let modelSrc = data.modeloGlb && data.modeloGlb.trim() !== '' ? data.modeloGlb : ''; visual.dataset.currentModel = modelSrc;

            if (modelSrc !== '') {
                let glbPath = modelSrc.startsWith('#') ? modelSrc : `url(${modelSrc})`;
                visual.setAttribute('gltf-model', glbPath); visual.setAttribute('anti-piscar', '');
                
                visual.addEventListener('model-loaded', () => { 
                    holograma.setAttribute('visible', 'false'); fallback.setAttribute('visible', 'false'); 
                    
                    let mesh = visual.getObject3D('mesh');
                    if(mesh) {
                        let bbox = new THREE.Box3().setFromObject(mesh);
                        let size = new THREE.Vector3(); bbox.getSize(size);
                        let center = new THREE.Vector3(); bbox.getCenter(center);
                        if(colisor) {
                            colisor.setAttribute('width', Math.max(0.5, size.x / escX));
                            colisor.setAttribute('height', Math.max(1.0, size.y / escY));
                            colisor.setAttribute('depth', Math.max(0.5, size.z / escZ));
                            let localCenterY = (center.y - el.object3D.position.y) / escY;
                            colisor.setAttribute('position', `0 ${localCenterY} 0`);
                        }
                    }
                });
                visual.addEventListener('model-error', () => { holograma.setAttribute('color', '#e74c3c'); holograma.setAttribute('opacity', '0.8'); fallback.innerHTML = `<a-cylinder color="#e74c3c" radius="0.4" height="1.8" position="0 0.9 0" opacity="0.8"></a-cylinder>`; fallback.setAttribute('visible', 'true'); });
            }

            let nomeTag = document.createElement('a-text'); el.appendChild(nomeTag); nomeTag.className = 'npc-nome-tag'; nomeTag.setAttribute('value', data.nome || 'NPC'); nomeTag.setAttribute('align', 'center'); nomeTag.setAttribute('position', '0 2.4 0'); nomeTag.setAttribute('color', '#f1c40f'); nomeTag.setAttribute('scale', '0.6 0.6 0.6'); nomeTag.setAttribute('side', 'double'); 
        });

        this.db.ref('cenario_npcs').on('child_changed', (snapshot) => {
            let id = snapshot.key; let data = snapshot.val(); let el = document.querySelector(`[data-npc-id="${id}"]`);
            if (el) {
                el.setAttribute('position', `${data.pos.x} ${data.pos.y} ${data.pos.z}`);
                let visual = el.querySelector('.modelo-visual');
                if(visual) {
                    let escX = data.escala ? data.escala.x : 1; let escY = data.escala ? data.escala.y : 1; let escZ = data.escala ? data.escala.z : 1; visual.setAttribute('scale', `${escX} ${escY} ${escZ}`);
                    let colisor = el.querySelector('.interativo');
                    if(colisor && colisor.tagName === 'A-BOX') colisor.setAttribute('scale', `${escX} ${escY} ${escZ}`);
                    
                    let newModel = data.modeloGlb && data.modeloGlb.trim() !== '' ? data.modeloGlb : '';
                    if (visual.dataset.currentModel !== newModel) { 
                        visual.dataset.currentModel = newModel; 
                        let glbPath = newModel.startsWith('#') ? newModel : `url(${newModel})`;
                        visual.setAttribute('gltf-model', glbPath); 
                        let holograma = el.querySelector('.npc-holograma'); if(holograma) { holograma.setAttribute('visible', 'true'); holograma.setAttribute('color', '#f1c40f'); } 
                    }
                }
                let colisor = el.querySelector('.interativo'); if (colisor) colisor.npcData = data; 
                let nomeTag = el.querySelector('.npc-nome-tag'); if (nomeTag) nomeTag.setAttribute('value', data.nome || 'NPC');
            }
        });

        this.db.ref('cenario_npcs').on('child_removed', (snapshot) => { let el = document.querySelector(`[data-npc-id="${snapshot.key}"]`); if (el && el.parentNode) el.parentNode.removeChild(el); });
    }
});
