// js/game-state.js

// Controle de Estado do Jogo
window.GAME_MODE = 'NONE'; 
window.GAME_STARTED = false; 
window.currentUser = null; 
window.lastActionTime = Date.now(); 
window.joystickVector = { x: 0, y: 0 };

// Controle de Menus
window.invAberto = false; 
window.atribAberto = false;
window.sysMenuAberto = false;
window.meuIdMultiplayer = null; 

// Status inicial padrão do Jogador
window.playerState = {
    nome: "Aventureiro",
    visual: { genero: 'M', rosto: 1, cabelo: 1, corCabelo: '#e74c3c', corPele: '#ffcd94' },
    nivel: 1, xp: 0, xpProxNivel: 50, pontos: 0, ouro: 0, forca: 10, velocidade: 5, defesa: 5, hpAtual: 100, hpMax: 100, mpAtual: 100, mpMax: 100, vivo: true,
    armaEquipada: 'Desarmado', escudoEquipado: false, nomeEscudo: 'Escudo de Madeira', flechas: 10, shurikens: 5, chaves: {}, invulneravel: false, ultimoRespawn: { id: 'base_inicial', x: 0, y: 0, z: 0 }
};

// Constantes de Animações
window.ANIM_PARADO = 'chr784_armature|chr784_bn01'; 
window.ANIM_ANDANDO = 'chr784_armature|chr784_br01'; 
window.ANIM_ATIRANDO = 'chr784_armature|chr784_ba01'; 
window.ANIM_DANO = 'chr784_armature|chr784_bd01'; 
window.ANIM_MORTE = 'chr784_armature|chr784_bd02'; 

// Banco Local de Armas e Itens
window.bancoDeArmas = {
    'Desarmado': { categoria: 'Luva', danoBonus: 0, defesaBonus: 0, distancia: 2.0, modeloGlb: '', visualDir: '', visualEsq: '' },
    'Espada Reta': { categoria: 'Espada', danoBonus: 5, defesaBonus: 1, distancia: 3.0, modeloGlb: '#modelo-espada-reta', escalaMao: '1 1 1', rotMao: '0 0 0', posMao: '0 0 0', escalaInv: '0.15 0.15 0.15', rotInv: '45 45 0', posInv: '0 0 0.05', swingRotacao: '0 0 0', swingAdditive: false, hitAdditive: false, visualDir: '<a-cylinder color="#8B4513" radius="0.02" height="0.15" position="0 0 0"></a-cylinder><a-box color="#DAA520" width="0.15" height="0.05" depth="0.05" position="0 0.075 0"></a-box><a-cylinder color="#aaa" radius="0.02" height="0.8" position="0 0.5 0"></a-cylinder>', visualEsq: '' },
    'Espada Curva': { categoria: 'Espada', danoBonus: 7, defesaBonus: 0, distancia: 3.0, modeloGlb: '', escalaMao: '1 1 1', rotMao: '0 0 0', posMao: '0 0 0', escalaInv: '0.1 0.1 0.1', rotInv: '0 0 0', posInv: '0 0 0.05', swingRotacao: '0 0 0', swingAdditive: false, hitAdditive: false, visualDir: '<a-cylinder color="#444" radius="0.02" height="0.15" position="0 0 0"></a-cylinder><a-cylinder color="#C0C0C0" radius="0.02" height="0.8" position="0.08 0.5 0" rotation="0 0 15"></a-cylinder>', visualEsq: '' },
    'Espada Grande': { categoria: 'Espada', danoBonus: 15, defesaBonus: -2, distancia: 4.0, modeloGlb: '#modelo-espada-grande', escalaMao: '1 1 1', rotMao: '0 0 0', posMao: '0 0 0', escalaInv: '0.1 0.1 0.1', rotInv: '45 45 0', posInv: '0 0 0.05', swingRotacao: '0 0 0', swingAdditive: false, hitAdditive: false, visualDir: '<a-cylinder color="#333" radius="0.03" height="0.2" position="0 0 0"></a-cylinder><a-box color="#555" width="0.3" height="0.06" depth="0.06" position="0 0.1 0"></a-box><a-box color="#999" width="0.1" height="1.2" depth="0.02" position="0 0.7 0"></a-box>', visualEsq: '' },
    'Luva de Boxe': { categoria: 'Luva', danoBonus: 3, defesaBonus: 2, distancia: 2.0, modeloGlb: '', escalaMao: '1 1 1', rotMao: '0 0 0', posMao: '0 0 0', escalaInv: '0.1 0.1 0.1', rotInv: '0 0 0', posInv: '0 0 0.05', swingRotacao: '0 0 0', swingAdditive: false, hitAdditive: false, visualDir: '<a-sphere color="#cc0000" radius="0.15" position="0 0.1 0"></a-sphere>', visualEsq: '<a-sphere color="#cc0000" radius="0.15" position="0 0.1 0"></a-sphere>' },
    'Varinha': { 
        categoria: 'Varinha', danoBonus: 10, defesaBonus: 0, distancia: 15.0, 
        modeloGlb: '', 
        escalaMao: '1 1 1', rotMao: '0 0 0', posMao: '0 0 0', 
        escalaInv: '0.1 0.1 0.1', rotInv: '0 0 0', posInv: '0 0 0.05', swingRotacao: '0 0 0', swingAdditive: false, hitAdditive: false,
        visualDir: `
            <a-cylinder color="#5C4033" radius="0.015" height="0.4" position="0 0.2 0"></a-cylinder>
            <a-sphere id="wand-tip-vis" color="#00FFFF" radius="0.04" position="0 0.4 0" material="emissive: #00FFFF; emissiveIntensity: 0.8"></a-sphere>
        `, 
        visualEsq: '' 
    },
    'Shuriken': { categoria: 'Shuriken', danoBonus: 5, defesaBonus: 0, distancia: 10.0, modeloGlb: '', escalaMao: '1 1 1', rotMao: '0 0 0', posMao: '0 0 0', escalaInv: '0.1 0.1 0.1', rotInv: '0 0 0', posInv: '0 0 0.05', swingRotacao: '0 0 0', swingAdditive: false, hitAdditive: false, visualDir: '<a-box color="#555" width="0.15" height="0.01" depth="0.15" position="0 0.05 0" rotation="0 0 0"></a-box><a-box color="#555" width="0.15" height="0.01" depth="0.15" position="0 0.05 0" rotation="0 45 0"></a-box>', visualEsq: '' },
    'Escudo de Madeira': { categoria: 'Escudo', danoBonus: 0, defesaBonus: 3, distancia: 0, modeloGlb: '', escalaMao: '1 1 1', rotMao: '0 0 0', posMao: '0 0 0', escalaInv: '0.1 0.1 0.1', rotInv: '0 0 0', posInv: '0 0 0.05', swingRotacao: '0 0 0', swingAdditive: false, hitAdditive: false, visualDir: '', visualEsq: '<a-box color="#8B4513" width="0.4" height="0.5" depth="0.05" position="0 0.1 0" rotation="-90 0 0"></a-box>' },
    'Escudo de Ferro': { categoria: 'Escudo', danoBonus: 0, defesaBonus: 6, distancia: 0, modeloGlb: '', escalaMao: '1 1 1', rotMao: '0 0 0', posMao: '0 0 0', escalaInv: '0.1 0.1 0.1', rotInv: '0 0 0', posInv: '0 0 0.05', swingRotacao: '0 0 0', swingAdditive: false, hitAdditive: false, visualDir: '', visualEsq: '<a-box color="#7F8C8D" width="0.45" height="0.55" depth="0.05" position="0 0.1 0" rotation="-90 0 0"><a-box color="#BDC3C7" width="0.4" height="0.5" depth="0.06" position="0 0 0"></a-box></a-box>' }
};