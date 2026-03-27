// ==========================================
// COMPONENTES A-FRAME (FÍSICA, VR, MOBILE E UI)
// ==========================================

AFRAME.registerComponent('rastro-espada-sao', {
    schema: { color: { type: 'color', default: '#00FFFF' }, duracao: { type: 'number', default: 300 } },
    init: function() {
        this.pontos = [];
        this.geometry = new THREE.BufferGeometry();
        this.material = new THREE.MeshBasicMaterial({ 
            color: 0xffffff, vertexColors: true, side: THREE.DoubleSide, 
            transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false 
        });
        this.mesh = new THREE.Mesh(this.geometry, this.material);
        this.mesh.frustumCulled = false;
        this.el.object3D.add(this.mesh); 
        this.ativo = true;
    },
    addPonto: function(base, ponta) {
        if(!this.ativo) return;
        this.pontos.push({ base: base.clone(), ponta: ponta.clone(), tempo: Date.now() });
        if(this.pontos.length > 30) this.pontos.shift();
        this.atualizarMalha();
    },
    finalizar: function() { this.ativo = false; },
    tick: function() {
        let agora = Date.now();
        if (!this.ativo) {
            if (this.pontos.length > 0) { this.pontos.shift(); this.atualizarMalha(); } 
            else { if (this.el.parentNode) this.el.parentNode.removeChild(this.el); }
        } else {
            while(this.pontos.length > 0 && agora - this.pontos[0].tempo > this.data.duracao) { this.pontos.shift(); }
            this.atualizarMalha();
        }
    },
    atualizarMalha: function() {
        if (this.pontos.length < 2) { this.geometry.setAttribute('position', new THREE.Float32BufferAttribute([], 3)); return; }
        let positions = []; let colors = []; let baseColor = new THREE.Color(this.data.color);
        for (let i = 0; i < this.pontos.length; i++) {
            let p = this.pontos[i];
            positions.push(p.base.x, p.base.y, p.base.z); positions.push(p.ponta.x, p.ponta.y, p.ponta.z);
            let fade = i / (this.pontos.length - 1); 
            colors.push(baseColor.r * fade, baseColor.g * fade, baseColor.b * fade);
            colors.push(baseColor.r * fade, baseColor.g * fade, baseColor.b * fade);
        }
        let indices = [];
        for (let i = 0; i < this.pontos.length - 1; i++) {
            let idx = i * 2; indices.push(idx, idx + 1, idx + 2); indices.push(idx + 1, idx + 3, idx + 2);
        }
        this.geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
        this.geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
        this.geometry.setIndex(indices);
        this.geometry.computeVertexNormals();
    },
    remove: function() { this.el.object3D.remove(this.mesh); this.geometry.dispose(); this.material.dispose(); }
});

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

// SISTEMA DE COLISÃO VR COM OSSOS (SAO STYLE PERFEITO)
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
            
            if (armaStats.categoria === 'Espada') {
                let corRastro = '#00FFFF';
                if(armaStats.danoBonus > 10) corRastro = '#ff0055'; 
                else if(armaStats.danoBonus > 6) corRastro = '#f1c40f';
                
                this.rastroEntidade = document.createElement('a-entity');
                this.rastroEntidade.setAttribute('position', '0 0 0');
                document.querySelector('a-scene').appendChild(this.rastroEntidade);
                this.rastroEntidade.setAttribute('rastro-espada-sao', `color: ${corRastro}; duracao: 400`);
            } else if (armaStats.categoria === 'Luva') {
                let vfxVento = document.createElement('a-entity');
                vfxVento.setAttribute('position', `${currentWorldPos.x} ${currentWorldPos.y} ${currentWorldPos.z}`);
                if (this.vel.lengthSq() > 0.01) vfxVento.object3D.lookAt(currentWorldPos.clone().add(this.vel));
                vfxVento.innerHTML = `<a-cone color="#ffffff" radius-bottom="0.1" radius-top="0.3" height="1.5" position="0 0 -0.75" rotation="-90 0 0" material="shader: flat; transparent: true; opacity: 0.5; blending: additive; depthWrite: false" animation__scale="property: scale; to: 1.5 2 1.5; dur: 200; easing: easeOutQuad" animation__fade="property: material.opacity; to: 0; dur: 200; easing: easeOutQuad"></a-cone><a-torus color="#ffffff" radius="0.2" radius-tubular="0.01" position="0 0 -0.5" material="shader: flat; transparent: true; opacity: 0.8; blending: additive; depthWrite: false" animation__scale="property: scale; to: 2.5 2.5 2.5; dur: 200; easing: easeOutQuad" animation__pos="property: position; to: 0 0 -1; dur: 200; easing: easeOutQuad" animation__fade="property: material.opacity; to: 0; dur: 200; easing: easeOutQuad"></a-torus>`;
                document.querySelector('a-scene').appendChild(vfxVento);
                setTimeout(() => { if(vfxVento.parentNode) vfxVento.parentNode.removeChild(vfxVento); }, 250);
            }
        }

        // --- LINHA GEOMÉTRICA DA ESPADA (Segmento 3D) ---
        let basePos = currentWorldPos.clone(); let tipPos = currentWorldPos.clone();
        let dirPonta = new THREE.Vector3(0, 0, -1).applyQuaternion(this.el.object3D.getWorldQuaternion(new THREE.Quaternion())); 
        let alcanceLâmina = armaStats.distancia ? Math.min(armaStats.distancia / 2.0, 1.5) : 1.0;
        tipPos.add(dirPonta.clone().multiplyScalar(alcanceLâmina)); 
        let linhaEspada = new THREE.Line3(basePos, tipPos);

        if (this.cortando) {
            if (time - this.tempoCorte > 400) { 
                this.cortando = false; 
                if (this.rastroEntidade && this.rastroEntidade.components['rastro-espada-sao']) this.rastroEntidade.components['rastro-espada-sao'].finalizar();
                this.rastroEntidade = null;
            } else if (armaStats.categoria === 'Espada') {
                if (this.rastroEntidade && this.rastroEntidade.components['rastro-espada-sao']) {
                    let rastroBase = basePos.clone().add(dirPonta.clone().multiplyScalar(0.1));
                    let rastroPonta = basePos.clone().add(dirPonta.clone().multiplyScalar(alcanceLâmina * 0.9));
                    this.rastroEntidade.components['rastro-espada-sao'].addPonto(rastroBase, rastroPonta);
                }
            }
        }

        let inimigosEls = document.querySelectorAll('[sistema-inimigo-sync]'); let agora = Date.now();
        inimigosEls.forEach(inimigoEl => {
            let syncComp = inimigoEl.components['sistema-inimigo-sync'];
            if(syncComp && syncComp.hpAtual > 0) {
                let hitDetectado = false;
                let posAcertoVFX = new THREE.Vector3();
                let visual = inimigoEl.querySelector('.modelo-visual');

                if (visual) {
                    let mesh = visual.getObject3D('mesh');
                    if (mesh) {
                        if (!visual.colisores) {
                            visual.colisores = { ossos: [], meshes: [] };
                            mesh.traverse(node => {
                                if (node.isBone) visual.colisores.ossos.push(node);
                                else if (node.isMesh) visual.colisores.meshes.push(node);
                            });
                        }

                        let escalaGlobal = visual.object3D.scale.y || 1;
                        let raioBase = 0.25 * escalaGlobal; // Esfera de colisão do osso que CRESCE junto com o inimigo!

                        if (visual.colisores.ossos.length > 0) {
                            let posOsso = new THREE.Vector3();
                            let pontoProjEspada = new THREE.Vector3();

                            for (let i = 0; i < visual.colisores.ossos.length; i++) {
                                visual.colisores.ossos[i].getWorldPosition(posOsso);
                                
                                if (armaStats.categoria === 'Espada') {
                                    linhaEspada.closestPointToPoint(posOsso, true, pontoProjEspada);
                                    if (pontoProjEspada.distanceTo(posOsso) <= raioBase) {
                                        hitDetectado = true; posAcertoVFX.copy(pontoProjEspada); break;
                                    }
                                } else { // Luva de Boxe
                                    if (currentWorldPos.distanceTo(posOsso) <= raioBase + 0.1) {
                                        hitDetectado = true; posAcertoVFX.copy(posOsso); break;
                                    }
                                }
                            }
                        } 
                        // FALLBACK: Inimigos como Caixas ou Geometrias sem esqueleto (Ex: Slimes estáticos)
                        else if (visual.colisores.meshes.length > 0) {
                            let ray = new THREE.Ray(basePos, dirPonta);
                            for (let i = 0; i < visual.colisores.meshes.length; i++) {
                                let m = visual.colisores.meshes[i]; m.updateMatrixWorld(true);
                                let tempBox = new THREE.Box3().setFromObject(m); tempBox.expandByScalar(0.1);
                                
                                if (armaStats.categoria === 'Espada') {
                                    let intersect = ray.intersectBox(tempBox, new THREE.Vector3());
                                    if (intersect && basePos.distanceTo(intersect) <= alcanceLâmina) {
                                        hitDetectado = true; posAcertoVFX.copy(intersect); break;
                                    }
                                } else {
                                    if (tempBox.containsPoint(currentWorldPos)) { hitDetectado = true; posAcertoVFX.copy(currentWorldPos); break; }
                                }
                            }
                        }
                    }
                }

                if (hitDetectado) {
                    let lastHit = this.lastHits.get(inimigoEl) || 0;
                    if (this.speed > 1.5 && (agora - lastHit > 400)) { 
                        syncComp.receberDano(Math.floor(window.playerState.forca + armaStats.danoBonus), armaStats.categoria);
                        window.gerarHitVFX(posAcertoVFX, armaStats, this.vel.clone()); this.lastHits.set(inimigoEl, agora);
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
        let posProj = new THREE.Vector3(); this.el.object3D.getWorldPosition(posProj);
        
        let inimigosAtuais = document.querySelectorAll('[sistema-inimigo-sync]');
        for (let i = 0; i < inimigosAtuais.length; i++) {
            let inimigo = inimigosAtuais[i]; let syncComp = inimigo.components['sistema-inimigo-sync']; if (!syncComp || syncComp.hpAtual <= 0) continue;
            
            let hitDetectado = false;
            let posHitVFX = new THREE.Vector3();
            let visual = inimigo.querySelector('.modelo-visual');

            if (visual) {
                let mesh = visual.getObject3D('mesh');
                if (mesh) {
                    if (!visual.colisores) {
                        visual.colisores = { ossos: [], meshes: [] };
                        mesh.traverse(n => { if (n.isBone) visual.colisores.ossos.push(n); else if (n.isMesh) visual.colisores.meshes.push(n); });
                    }
                    let escalaGlobal = visual.object3D.scale.y || 1;
                    let raioBase = 0.3 * escalaGlobal;

                    if (visual.colisores.ossos.length > 0) {
                        let posOsso = new THREE.Vector3();
                        for (let j = 0; j < visual.colisores.ossos.length; j++) {
                            visual.colisores.ossos[j].getWorldPosition(posOsso);
                            if (posProj.distanceTo(posOsso) <= raioBase + 0.1) {
                                hitDetectado = true; posHitVFX.copy(posOsso); break;
                            }
                        }
                    } else if (visual.colisores.meshes.length > 0) {
                        for (let j = 0; j < visual.colisores.meshes.length; j++) {
                            let m = visual.colisores.meshes[j]; m.updateMatrixWorld(true);
                            let tempBox = new THREE.Box3().setFromObject(m); tempBox.expandByScalar(0.2);
                            if (tempBox.containsPoint(posProj)) { hitDetectado = true; posHitVFX.copy(posProj); break; }
                        }
                    }
                }
            }

            if (hitDetectado) { 
                syncComp.receberDano(this.data.dano, 'Varinha'); 
                window.gerarHitVFX(posHitVFX, window.bancoDeArmas[this.data.armaOriginal] || window.bancoDeArmas['Varinha'], this.vel.clone());
                if(this.el.parentNode) this.el.parentNode.removeChild(this.el); break; 
            }
        }
    }
});

AFRAME.registerComponent('projetil-fisico', {
    schema: { velocidade: {type: 'vec3'}, dano: {type: 'number', default: 10}, armaOriginal: {type: 'string', default: 'Shuriken'} },
    init: function () { 
        this.gravidade = new THREE.Vector3(0, -2.0, 0); 
        this.vel = new THREE.Vector3(this.data.velocidade.x, this.data.velocidade.y, this.data.velocidade.z); 
        this.ativo = true; 
        
        setTimeout(() => {
            this.rastro = document.createElement('a-entity');
            this.rastro.setAttribute('position', '0 0 0');
            this.el.sceneEl.appendChild(this.rastro);
            this.rastro.setAttribute('rastro-espada-sao', 'color: #ffffff; duracao: 250');
        }, 10);
    },
    tick: function (time, timeDelta) {
        if (!this.ativo) return; let dt = timeDelta / 1000; if (dt === 0) return;
        this.vel.add(this.gravidade.clone().multiplyScalar(dt)); this.el.object3D.position.add(this.vel.clone().multiplyScalar(dt)); this.el.object3D.rotation.y += 15 * dt;

        let posProj = new THREE.Vector3(); this.el.object3D.getWorldPosition(posProj);

        if (this.rastro && this.rastro.components['rastro-espada-sao']) {
            let posCenter = posProj.clone();
            let dir = this.vel.clone().normalize();
            if(dir.lengthSq() === 0) dir.set(0,0,-1);
            let right = new THREE.Vector3().crossVectors(dir, new THREE.Vector3(0, 1, 0)).normalize();
            if(right.lengthSq() === 0) right.set(1,0,0);
            right.multiplyScalar(0.15); 
            
            let pBase = posCenter.clone().add(right);
            let pPonta = posCenter.clone().sub(right);
            this.rastro.components['rastro-espada-sao'].addPonto(pBase, pPonta);
        }

        if (this.el.object3D.position.y < 0.05) { 
            this.el.object3D.position.y = 0.05; this.ativo = false; this.el.classList.add('shuriken-chao'); 
            if (this.rastro && this.rastro.components['rastro-espada-sao']) this.rastro.components['rastro-espada-sao'].finalizar();
            setTimeout(() => { if (this.el && this.el.parentNode) this.el.parentNode.removeChild(this.el); }, 8000); return; 
        }
        
        let inimigosAtuais = document.querySelectorAll('[sistema-inimigo-sync]');
        for (let i = 0; i < inimigosAtuais.length; i++) {
            let inimigo = inimigosAtuais[i]; let syncComp = inimigo.components['sistema-inimigo-sync']; if (!syncComp || syncComp.hpAtual <= 0) continue;
            
            let hitDetectado = false;
            let posHitVFX = new THREE.Vector3();
            let visual = inimigo.querySelector('.modelo-visual');

            if (visual) {
                let mesh = visual.getObject3D('mesh');
                if (mesh) {
                    if (!visual.colisores) {
                        visual.colisores = { ossos: [], meshes: [] };
                        mesh.traverse(n => { if (n.isBone) visual.colisores.ossos.push(n); else if (n.isMesh) visual.colisores.meshes.push(n); });
                    }
                    let escalaGlobal = visual.object3D.scale.y || 1;
                    let raioBase = 0.25 * escalaGlobal;

                    if (visual.colisores.ossos.length > 0) {
                        let posOsso = new THREE.Vector3();
                        for (let j = 0; j < visual.colisores.ossos.length; j++) {
                            visual.colisores.ossos[j].getWorldPosition(posOsso);
                            if (posProj.distanceTo(posOsso) <= raioBase + 0.1) {
                                hitDetectado = true; posHitVFX.copy(posOsso); break;
                            }
                        }
                    } else if (visual.colisores.meshes.length > 0) {
                        for (let j = 0; j < visual.colisores.meshes.length; j++) {
                            let m = visual.colisores.meshes[j]; m.updateMatrixWorld(true);
                            let tempBox = new THREE.Box3().setFromObject(m); tempBox.expandByScalar(0.1);
                            if (tempBox.containsPoint(posProj)) { hitDetectado = true; posHitVFX.copy(posProj); break; }
                        }
                    }
                }
            }

            if (hitDetectado) { 
                syncComp.receberDano(this.data.dano, 'Arco'); 
                window.gerarHitVFX(posHitVFX, window.bancoDeArmas[this.data.armaOriginal] || window.bancoDeArmas['Shuriken'], this.vel.clone());
                if (this.rastro && this.rastro.components['rastro-espada-sao']) this.rastro.components['rastro-espada-sao'].finalizar();
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
