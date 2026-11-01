import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { clone } from 'three/addons/utils/SkeletonUtils.js';

const FIGHTERS = [
    { id: 'houry', name: 'Houry', power: 1 },
    { id: 'hashem', name: 'Hashem', power: 2 },
    { id: 'tia', name: 'Tia', power: 3 },
    { id: 'chalfouno', name: 'Anthony', power: 4 },
    { id: 'fanso', name: 'Fanso', power: 5 },
    { id: 'leyla', name: 'Leyla', power: 5 },
    { id: 'hazar', name: 'Hazar', power: 6 }
];

const LIMBS = [
    { key: 'armL', part: 'arm', bone: 'LeftArm', child: 'LeftForeArm', side: 1 },
    { key: 'foreL', part: 'fore', bone: 'LeftForeArm', child: 'LeftHand', side: 1 },
    { key: 'armR', part: 'arm', bone: 'RightArm', child: 'RightForeArm', side: -1 },
    { key: 'foreR', part: 'fore', bone: 'RightForeArm', child: 'RightHand', side: -1 },
    { key: 'thighL', part: 'thigh', bone: 'LeftUpLeg', child: 'LeftLeg', side: 1 },
    { key: 'shinL', part: 'shin', bone: 'LeftLeg', child: 'LeftFoot', side: 1 },
    { key: 'thighR', part: 'thigh', bone: 'RightUpLeg', child: 'RightLeg', side: -1 },
    { key: 'shinR', part: 'shin', bone: 'RightLeg', child: 'RightFoot', side: -1 }
];

const GUARD_ARM = [0.25, -0.9, 0.35];
const GUARD_FORE = [-0.15, 0.55, 0.8];
const STAND_THIGH = [0.08, -1, 0];
const STAND_SHIN = [0.04, -1, -0.1];

const LIMIT_X = 5;
const LIMIT_Z = 2;
const FOE_STRENGTH = 0.7;
const GROW_BY = 0.1;
const MAX_SIZE = 2;

const canvas = document.getElementById('game');
const renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x9fd0ff);

const camera = new THREE.PerspectiveCamera(55, 1, 0.1, 100);
camera.position.set(0, 1.4, 8);

scene.add(new THREE.HemisphereLight(0xffffff, 0x888888, 2.2));
const sun = new THREE.DirectionalLight(0xffffff, 2);
sun.position.set(3, 8, 6);
scene.add(sun);

const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(80, 80),
    new THREE.MeshStandardMaterial({ color: 0x9a9a9a })
);
ground.rotation.x = -Math.PI / 2;
scene.add(ground);

const models = {};
const loader = new GLTFLoader();
const clock = new THREE.Clock();
const temp = new THREE.Vector3();
const quatA = new THREE.Quaternion();
const quatB = new THREE.Quaternion();
const keys = { left: false, right: false };

let myId = 'hazar';
let mode = 'single';
let fights = [];
let round = 0;
let mySize = 1;
let me = null;
let fighters = [];
let playing = false;
let roundOver = false;
let token = 0;
let againMode = 'restart';

function getEl(id) {
    return document.getElementById(id);
}

function findFighter(id) {
    for (let i = 0; i < FIGHTERS.length; i++) {
        if (FIGHTERS[i].id === id) return FIGHTERS[i];
    }
}

function labelOf(fighter) {
    if (fighter.id === 'hazar') return fighter.name + ' 🙌';
    return fighter.name;
}

function isPair(id) {
    return id === 'fanso' || id === 'leyla';
}

function partnerOf(id) {
    if (id === 'fanso') return 'leyla';
    if (id === 'leyla') return 'fanso';
    return null;
}

function say(text, isError) {
    getEl('status').textContent = text;
    getEl('status').classList.toggle('error', isError === true);
}

function flash(text) {
    getEl('banner').textContent = text;
    getEl('banner').classList.add('show');
    setTimeout(function () {
        getEl('banner').classList.remove('show');
    }, 1500);
}

function rain() {
    for (let i = 0; i < 26; i++) {
        const drop = document.createElement('span');
        drop.className = 'drop';
        drop.textContent = '🙌';
        drop.style.left = Math.random() * 94 + 'vw';
        drop.style.animationDelay = Math.random() * 1.5 + 's';
        document.body.appendChild(drop);
        setTimeout(function () {
            drop.remove();
        }, 5200);
    }
}

function fillPic(box, fighter) {
    box.innerHTML = '<b>' + fighter.name[0] + '</b>';

    const folders = ['', 'pics/'];
    const names = [fighter.id, fighter.name.toLowerCase()];
    const endings = ['.png', '.jpg', '.jpeg'];
    const paths = [];

    for (let a = 0; a < folders.length; a++) {
        for (let b = 0; b < names.length; b++) {
            for (let c = 0; c < endings.length; c++) {
                const path = folders[a] + names[b] + endings[c];
                if (paths.indexOf(path) === -1) paths.push(path);
            }
        }
    }

    let tries = 0;
    const img = new Image();
    img.onload = function () {
        box.appendChild(img);
    };
    img.onerror = function () {
        tries = tries + 1;
        if (tries < paths.length) img.src = paths[tries];
    };
    img.src = paths[0];
}

function buildFights() {
    const list = [];

    if (myId === 'hazar' && mode === 'group') {
        list.push(['houry', 'hashem', 'tia']);
        list.push(['chalfouno', 'fanso', 'leyla']);
        return list;
    }

    let pairAdded = false;
    for (let i = 0; i < FIGHTERS.length; i++) {
        const id = FIGHTERS[i].id;
        if (id === myId) continue;
        if (isPair(id)) {
            if (isPair(myId) || pairAdded) continue;
            list.push(['fanso', 'leyla']);
            pairAdded = true;
        } else {
            list.push([id]);
        }
    }
    return list;
}

function refreshMenu() {
    if (myId !== 'hazar') mode = 'single';
    getEl('modes').hidden = myId !== 'hazar';

    const chips = document.querySelectorAll('.chip');
    for (let i = 0; i < chips.length; i++) {
        chips[i].classList.toggle('on', chips[i].dataset.mode === mode);
    }

    const cards = document.querySelectorAll('.card');
    for (let i = 0; i < cards.length; i++) {
        cards[i].classList.toggle('on', cards[i].dataset.id === myId);
    }

    fights = buildFights();
    const parts = [];
    for (let i = 0; i < fights.length; i++) {
        const names = [];
        for (let j = 0; j < fights[i].length; j++) {
            names.push(findFighter(fights[i][j]).name);
        }
        parts.push(names.join(' + '));
    }

    let text = 'Fights: ' + parts.join(' → ');
    if (isPair(myId)) text = text + '. ' + findFighter(partnerOf(myId)).name + ' fights with you.';
    say(text);
}

function buildCards() {
    for (let i = 0; i < FIGHTERS.length; i++) {
        const fighter = FIGHTERS[i];

        const card = document.createElement('button');
        card.className = 'card';
        card.dataset.id = fighter.id;

        const pic = document.createElement('span');
        pic.className = 'pic';
        fillPic(pic, fighter);

        const name = document.createElement('strong');
        name.textContent = labelOf(fighter);

        const power = document.createElement('span');
        power.className = 'power';
        for (let p = 1; p <= 6; p++) {
            const dot = document.createElement('i');
            if (p <= fighter.power) dot.className = 'on';
            power.appendChild(dot);
        }

        card.appendChild(pic);
        card.appendChild(name);
        card.appendChild(power);
        card.addEventListener('click', function () {
            myId = fighter.id;
            refreshMenu();
        });
        getEl('cards').appendChild(card);
    }

    const chips = document.querySelectorAll('.chip');
    for (let i = 0; i < chips.length; i++) {
        chips[i].addEventListener('click', function () {
            mode = chips[i].dataset.mode;
            refreshMenu();
        });
    }

    refreshMenu();
}

async function loadModel(id) {
    if (models[id]) return;
    const res = await fetch(encodeURI(id + '.zip'));
    if (!res.ok) throw new Error(id + '.zip was not found');
    const zip = await JSZip.loadAsync(await res.arrayBuffer());
    const files = zip.file(/\.glb$/i);
    if (files.length === 0) throw new Error('no .glb file inside ' + id + '.zip');
    const buffer = await files[0].async('arraybuffer');
    const gltf = await new Promise(function (ok, fail) {
        loader.parse(buffer, '', ok, fail);
    });
    models[id] = gltf.scene;
}

function boneQuat(node, root, out) {
    out.identity();
    let n = node;
    while (n && n !== root) {
        out.premultiply(n.quaternion);
        n = n.parent;
    }
    return out;
}

function makeLimb(def, model) {
    const bone = model.getObjectByName(def.bone);
    const child = model.getObjectByName(def.child);
    if (!bone || !child) {
        console.warn('Missing bone: ' + def.bone);
        return null;
    }
    const restDir = child.getWorldPosition(new THREE.Vector3())
        .sub(bone.getWorldPosition(new THREE.Vector3()))
        .normalize();
    return {
        key: def.key,
        part: def.part,
        side: def.side,
        bone: bone,
        root: model,
        restDir: restDir,
        restQuat: boneQuat(bone, model, new THREE.Quaternion()),
        dir: restDir.clone()
    };
}

function makeFighter(id, isMe, team, level) {
    const data = findFighter(id);
    const up = 1 + level * 0.3;
    const holder = new THREE.Group();
    const body = new THREE.Group();
    const model = clone(models[id]);
    body.add(model);
    holder.add(body);
    scene.add(holder);

    const limbs = [];
    for (let i = 0; i < LIMBS.length; i++) {
        const limb = makeLimb(LIMBS[i], model);
        if (limb) limbs.push(limb);
    }

    const power = data.power;
    const fighter = {
        data: data,
        isMe: isMe,
        team: team,
        holder: holder,
        body: body,
        limbs: limbs,
        x: 0,
        z: 0,
        yaw: 0,
        pushX: 0,
        pushZ: 0,
        hp: (70 + power * 15) * (1 + level * 0.25),
        maxHp: (70 + power * 15) * (1 + level * 0.25),
        speed: (1.6 + power * 0.75) * up,
        punch: 4 + power * 1.3,
        kick: (4 + power * 1.3) * 1.6,
        attackTime: Math.max(0.15, (0.62 - power * 0.06) / up),
        waitTime: Math.max(0.3, (1.7 - power * 0.17) / up),
        wait: 1 + Math.random(),
        strength: isMe ? 1 : FOE_STRENGTH + level * 0.2,
        size: 1,
        shown: 1,
        state: 'idle',
        attack: null,
        hand: 'R',
        moving: false,
        walk: 0,
        time: 0,
        hurtTime: 0,
        lean: 0,
        fill: null,
        nameEl: null
    };

    fighters.push(fighter);
    return fighter;
}

function addHudBox(f, parent) {
    const box = document.createElement('div');
    box.className = 'player';

    const pic = document.createElement('span');
    pic.className = 'pic';
    fillPic(pic, f.data);

    const info = document.createElement('div');
    info.className = 'player-info';

    const name = document.createElement('strong');
    name.textContent = labelOf(f.data);

    const bar = document.createElement('div');
    bar.className = 'bar';
    const fill = document.createElement('div');
    if (f.team === 'B') fill.className = 'red';
    bar.appendChild(fill);

    info.appendChild(name);
    info.appendChild(bar);
    box.appendChild(pic);
    box.appendChild(info);
    parent.appendChild(box);

    f.fill = fill;
    f.nameEl = name;
}

function aimLimb(limb, target, k) {
    temp.set(target[0] * limb.side, target[1], target[2]).normalize();
    limb.dir.lerp(temp, k).normalize();
    quatA.setFromUnitVectors(limb.restDir, limb.dir);
    boneQuat(limb.bone.parent, limb.root, quatB).invert();
    limb.bone.quaternion.copy(quatB).multiply(quatA).multiply(limb.restQuat);
}

function mix(a, b, t) {
    return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
}

function updatePose(f, dt) {
    f.time = f.time + dt;
    f.shown = f.shown + (f.size - f.shown) * Math.min(1, dt * 4);

    const pose = { arm: GUARD_ARM, fore: GUARD_FORE, thigh: STAND_THIGH, shin: STAND_SHIN };
    let lean = 0;
    let lift = 0;

    if (f.moving) {
        const s = Math.sin(f.walk * 10);
        pose.thighL = [0.08, -1, s * 0.6];
        pose.thighR = [0.08, -1, -s * 0.6];
        pose.shinL = [0.04, -1, -0.1 - Math.max(0, -s) * 0.7];
        pose.shinR = [0.04, -1, -0.1 - Math.max(0, s) * 0.7];
        lift = Math.abs(s) * 0.04;
    }

    if (f.state === 'fall') {
        pose.arm = [1, -0.3, 0.1];
        pose.fore = [1, -0.2, 0.1];
        pose.thigh = [0.4, -1, 0];
        pose.shin = [0.2, -1, 0];
        lean = -Math.PI / 2;
        lift = 0.22 * f.shown;
    } else if (f.state === 'win') {
        pose.arm = [0.3, 1, 0];
        pose.fore = [0.1, 1, 0];
        lift = Math.abs(Math.sin(f.time * 7)) * 0.15;
    } else if (f.state === 'hurt') {
        pose.arm = [0.4, -1, -0.2];
        pose.fore = [0.2, -0.8, 0.3];
        lean = -0.35;
    } else if (f.attack) {
        const a = f.attack;
        const e = Math.sin(Math.min(1, a.time / a.total) * Math.PI);
        if (a.type === 'punch') {
            pose['arm' + a.hand] = mix(GUARD_ARM, [0.05, 0.05, 1], e);
            pose['fore' + a.hand] = mix(GUARD_FORE, [0.02, 0.02, 1], e);
            lean = e * 0.15;
        } else {
            pose['thigh' + a.hand] = mix(STAND_THIGH, [0.05, 0.25, 1], e);
            pose['shin' + a.hand] = mix(STAND_SHIN, [0.03, 0.15, 1], e);
            lean = -e * 0.25;
        }
    }

    f.lean = f.lean + (lean - f.lean) * Math.min(1, dt * 12);
    f.body.rotation.x = f.lean;
    f.holder.position.set(f.x, lift, f.z);
    f.holder.rotation.y = f.yaw;
    f.holder.scale.setScalar(f.shown);

    const k = 1 - Math.exp(-dt * 14);
    for (let i = 0; i < f.limbs.length; i++) {
        const limb = f.limbs[i];
        aimLimb(limb, pose[limb.key] || pose[limb.part], k);
    }
}

function nearestEnemy(f) {
    let best = null;
    let bestDistance = 9999;
    for (let i = 0; i < fighters.length; i++) {
        const other = fighters[i];
        if (other.team === f.team || other.state === 'fall') continue;
        const distance = Math.hypot(other.x - f.x, other.z - f.z);
        if (distance < bestDistance) {
            bestDistance = distance;
            best = other;
        }
    }
    return best;
}

function countAlive(team) {
    let count = 0;
    for (let i = 0; i < fighters.length; i++) {
        if (fighters[i].team === team && fighters[i].state !== 'fall') count = count + 1;
    }
    return count;
}

function turnTo(f, x, z, dt) {
    const want = Math.atan2(x - f.x, z - f.z);
    let diff = want - f.yaw;
    diff = Math.atan2(Math.sin(diff), Math.cos(diff));
    f.yaw = f.yaw + diff * Math.min(1, dt * 12);
}

function startAttack(f, type) {
    if (roundOver || f.state !== 'idle' || f.attack) return;
    let total = f.attackTime;
    if (type === 'kick') total = f.attackTime * 1.4;
    f.attack = { type: type, time: 0, total: total, hit: false, hand: f.hand };
    if (f.hand === 'L') f.hand = 'R';
    else f.hand = 'L';
}

function growMe() {
    me.size = Math.min(MAX_SIZE, me.size + GROW_BY);
    mySize = me.size;
    me.hp = Math.min(me.maxHp, me.hp + me.maxHp * 0.2);
    flash('Bigger! x' + me.size.toFixed(1));
}

function hurtFighter(target, damage, dirX, dirZ) {
    target.hp = target.hp - damage;
    target.pushX = dirX * 5;
    target.pushZ = dirZ * 5;
    target.attack = null;
    if (target.hp <= 0) {
        target.hp = 0;
        target.state = 'fall';
        if (target.team === 'B') growMe();
    } else {
        target.state = 'hurt';
        target.hurtTime = 0.25;
    }
}

function updateAttack(f, dt) {
    if (!f.attack) return;
    const a = f.attack;
    a.time = a.time + dt;
    const progress = a.time / a.total;

    const forwardX = Math.sin(f.yaw);
    const forwardZ = Math.cos(f.yaw);
    const lunge = Math.sin(Math.min(1, progress) * Math.PI) * 1.5 * dt;
    f.x = f.x + forwardX * lunge;
    f.z = f.z + forwardZ * lunge;

    if (!a.hit && progress >= 0.45) {
        a.hit = true;
        let range = 1.5;
        let damage = f.punch;
        if (a.type === 'kick') {
            range = 1.9;
            damage = f.kick;
        }

        for (let i = 0; i < fighters.length; i++) {
            const other = fighters[i];
            if (other.team === f.team || other.state === 'fall') continue;
            const dx = other.x - f.x;
            const dz = other.z - f.z;
            const distance = Math.hypot(dx, dz);
            const reach = range * (f.shown + other.shown) / 2;
            if (distance > reach || distance < 0.001) continue;
            if ((dx * forwardX + dz * forwardZ) / distance < 0.3) continue;
            hurtFighter(other, damage * f.strength * f.size, dx / distance, dz / distance);
        }
    }

    if (a.time >= a.total) f.attack = null;
}

function movePlayer(dt) {
    me.moving = false;
    if (me.state !== 'idle' || me.attack) return;

    if (keys.left) {
        me.x = me.x - me.speed * dt;
        me.moving = true;
    }
    if (keys.right) {
        me.x = me.x + me.speed * dt;
        me.moving = true;
    }
    if (me.moving) me.walk = me.walk + dt;
}

function moveComputer(f, dt) {
    f.moving = false;
    if (f.state !== 'idle' || f.attack) return;

    const target = nearestEnemy(f);
    if (!target) return;

    const dx = target.x - f.x;
    const dz = target.z - f.z;
    const distance = Math.hypot(dx, dz);
    const stopAt = 1.2 * (f.shown + target.shown) / 2;

    if (distance > stopAt) {
        f.x = f.x + (dx / distance) * f.speed * dt;
        f.z = f.z + (dz / distance) * f.speed * dt;
        f.moving = true;
        f.walk = f.walk + dt;
    } else {
        f.wait = f.wait - dt;
        if (f.wait <= 0) {
            if (Math.random() < 0.6) startAttack(f, 'punch');
            else startAttack(f, 'kick');
            f.wait = f.waitTime * (0.7 + Math.random() * 0.6);
        }
    }
}

function updateTimers(f, dt) {
    if (f.state === 'hurt') {
        f.hurtTime = f.hurtTime - dt;
        if (f.hurtTime <= 0) f.state = 'idle';
    }
    f.x = f.x + f.pushX * dt;
    f.z = f.z + f.pushZ * dt;
    f.pushX = f.pushX - f.pushX * Math.min(1, dt * 7);
    f.pushZ = f.pushZ - f.pushZ * Math.min(1, dt * 7);
}

function keepInside() {
    for (let i = 0; i < fighters.length; i++) {
        for (let j = i + 1; j < fighters.length; j++) {
            const a = fighters[i];
            const b = fighters[j];
            if (a.state === 'fall' || b.state === 'fall') continue;
            const dx = b.x - a.x;
            const dz = b.z - a.z;
            const distance = Math.hypot(dx, dz);
            const gap = 0.9 * (a.shown + b.shown) / 2;
            if (distance < gap && distance > 0.001) {
                const half = (gap - distance) / 2;
                a.x = a.x - (dx / distance) * half;
                a.z = a.z - (dz / distance) * half;
                b.x = b.x + (dx / distance) * half;
                b.z = b.z + (dz / distance) * half;
            }
        }
    }

    for (let i = 0; i < fighters.length; i++) {
        fighters[i].x = Math.max(-LIMIT_X, Math.min(LIMIT_X, fighters[i].x));
        fighters[i].z = Math.max(-LIMIT_Z, Math.min(LIMIT_Z, fighters[i].z));
    }
}

function moveCamera(dt) {
    let left = 9999;
    let right = -9999;
    for (let i = 0; i < fighters.length; i++) {
        if (fighters[i].state === 'fall') continue;
        left = Math.min(left, fighters[i].x);
        right = Math.max(right, fighters[i].x);
    }
    if (left > right) {
        left = me.x;
        right = me.x;
    }

    const middle = (left + right) / 2;
    let distance = 4.4 + (right - left) * 0.6 + (me.shown - 1) * 3;
    if (camera.aspect < 1) distance = distance * 1.7;

    camera.position.x = camera.position.x + (middle - camera.position.x) * Math.min(1, dt * 6);
    camera.position.z = camera.position.z + (distance - camera.position.z) * Math.min(1, dt * 4);
    camera.position.y = 1.2 + (me.shown - 1) * 0.8;
    camera.lookAt(camera.position.x, 1 * me.shown, 0);
}

function updateHud() {
    for (let i = 0; i < fighters.length; i++) {
        const f = fighters[i];
        f.fill.style.width = (f.hp / f.maxHp) * 100 + '%';
    }
    me.nameEl.textContent = labelOf(me.data) + ' x' + me.size.toFixed(1);
}

function showResult(title, text, buttonText, mode) {
    getEl('resultTitle').textContent = title;
    getEl('resultText').textContent = text;
    getEl('again').textContent = buttonText;
    againMode = mode;
    getEl('result').hidden = false;
}

function checkRound() {
    if (roundOver) return;
    const myToken = token;

    if (countAlive('B') === 0) {
        roundOver = true;
        for (let i = 0; i < fighters.length; i++) {
            if (fighters[i].team === 'A' && fighters[i].state !== 'fall') {
                fighters[i].state = 'win';
                fighters[i].attack = null;
                fighters[i].moving = false;
            }
        }

        setTimeout(function () {
            if (myToken !== token) return;
            if (round + 1 >= fights.length) {
                rain();
                showResult(labelOf(me.data) + ' beat everybody 🙌', 'Final size: x' + me.size.toFixed(1), 'Play again', 'restart');
            } else {
                round = round + 1;
                startRound();
            }
        }, 1800);
    } else if (me.state === 'fall') {
        roundOver = true;
        setTimeout(function () {
            if (myToken !== token) return;
            showResult(labelOf(me.data) + ' got knocked out 😵', 'Even the best fall sometimes.', 'Try again', 'retry');
        }, 1800);
    }
}

function startRound() {
    token = token + 1;
    for (let i = 0; i < fighters.length; i++) {
        scene.remove(fighters[i].holder);
    }
    fighters = [];
    roundOver = false;
    getEl('result').hidden = true;
    getEl('myTeam').innerHTML = '';
    getEl('foeTeam').innerHTML = '';
    document.body.dataset.screen = 'arena';
    resize();

    me = makeFighter(myId, true, 'A', 0);
    me.size = mySize;
    me.shown = mySize;
    me.x = -1.8;
    me.yaw = Math.PI / 2;
    addHudBox(me, getEl('myTeam'));

    if (isPair(myId)) {
        const partner = makeFighter(partnerOf(myId), false, 'A', 0);
        partner.x = -2.8;
        partner.z = 0.9;
        partner.yaw = Math.PI / 2;
        addHudBox(partner, getEl('myTeam'));
    }

    const ids = fights[round];
    const names = [];
    for (let i = 0; i < ids.length; i++) {
        const foe = makeFighter(ids[i], false, 'B', round);
        foe.x = 2 + (i % 2) * 0.7;
        foe.z = (i - (ids.length - 1) / 2) * 1.2;
        foe.yaw = -Math.PI / 2;
        addHudBox(foe, getEl('foeTeam'));
        names.push(labelOf(foe.data));
    }

    getEl('round').textContent = 'Fight ' + (round + 1) + ' of ' + fights.length;
    camera.position.set(0, 1.2, 6);
    playing = true;
    let banner = 'Fight ' + (round + 1) + ': ' + names.join(' + ');
    if (round > 0) banner = banner + ' (stronger!)';
    flash(banner);
}

async function startGame() {
    getEl('start').disabled = true;
    fights = buildFights();

    const needed = [myId];
    if (isPair(myId)) needed.push(partnerOf(myId));
    for (let i = 0; i < fights.length; i++) {
        for (let j = 0; j < fights[i].length; j++) {
            if (needed.indexOf(fights[i][j]) === -1) needed.push(fights[i][j]);
        }
    }

    try {
        for (let i = 0; i < needed.length; i++) {
            say('Loading ' + needed[i] + ' (' + (i + 1) + '/' + needed.length + ')...');
            await loadModel(needed[i]);
        }
    } catch (err) {
        console.error(err);
        getEl('start').disabled = false;
        say('Problem: ' + err.message + '. Keep the zip files in the same folder as index.html and open the game with Live Server.', true);
        return;
    }

    getEl('start').disabled = false;
    refreshMenu();
    round = 0;
    mySize = 1;
    startRound();
}

function goToMenu() {
    token = token + 1;
    playing = false;
    getEl('result').hidden = true;
    document.body.dataset.screen = 'select';
}

function resize() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.fov = w / h < 1 ? 70 : 55;
    camera.updateProjectionMatrix();
}

function holdButton(id, name) {
    const button = getEl(id);
    button.addEventListener('pointerdown', function (e) {
        e.preventDefault();
        keys[name] = true;
    });
    button.addEventListener('pointerup', function () {
        keys[name] = false;
    });
    button.addEventListener('pointerleave', function () {
        keys[name] = false;
    });
    button.addEventListener('pointercancel', function () {
        keys[name] = false;
    });
}

function tapButton(id, type) {
    getEl(id).addEventListener('pointerdown', function (e) {
        e.preventDefault();
        if (playing) startAttack(me, type);
    });
}

holdButton('leftBtn', 'left');
holdButton('rightBtn', 'right');
tapButton('punchBtn', 'punch');
tapButton('kickBtn', 'kick');

document.querySelector('.pad').addEventListener('contextmenu', function (e) {
    e.preventDefault();
});

getEl('start').addEventListener('click', startGame);
getEl('menuBtn').addEventListener('click', goToMenu);
getEl('back').addEventListener('click', goToMenu);
getEl('again').addEventListener('click', function () {
    if (againMode === 'retry') startRound();
    else startGame();
});
window.addEventListener('resize', resize);

function loop() {
    requestAnimationFrame(loop);
    if (!playing) return;

    const dt = Math.min(clock.getDelta(), 0.05);

    movePlayer(dt);
    for (let i = 0; i < fighters.length; i++) {
        const f = fighters[i];
        if (!f.isMe) moveComputer(f, dt);
        updateAttack(f, dt);
        updateTimers(f, dt);
    }
    keepInside();

    for (let i = 0; i < fighters.length; i++) {
        const f = fighters[i];
        if (f.state === 'idle' || f.state === 'hurt') {
            const target = nearestEnemy(f);
            if (target) turnTo(f, target.x, target.z, dt);
        }
        updatePose(f, dt);
    }

    checkRound();
    moveCamera(dt);
    updateHud();
    renderer.render(scene, camera);
}

buildCards();
resize();
loop();