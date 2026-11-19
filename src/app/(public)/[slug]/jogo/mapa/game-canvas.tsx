"use client";

import { useEffect, useRef } from "react";

// ─── Modo Gamificado · Cena jogável (S4, Fase 1: Recepção) ──────────────────
// Phaser 3 é carregado como script vendored same-origin (public/game/vendor),
// NÃO como dependência npm — assim não entra no bundle clássico e não exige
// mexer no node_modules (ver docs/ASSETS-LICENSES.md e AGENTS.md). A UI (diálogo,
// D-pad, botões) é React por cima do <canvas>; o Phaser só cuida do mundo andável.

const PHASER_SRC = "/game/vendor/phaser-3.88.2.min.js";
const SPEED = 130;
const FRAMES_PER_DIR = 9; // sheets LPC: 9 colunas × 4 linhas
// linhas do sheet: 0 cima, 1 esquerda, 2 baixo, 3 direita
const ROW = { down: 2, up: 0, left: 1, right: 3 } as const;
type Dir = keyof typeof ROW;

export type Controls = {
  up: boolean;
  down: boolean;
  left: boolean;
  right: boolean;
  interact: boolean; // edge-trigger: a cena consome e zera
};

// Phaser vem do script global; tipamos como unknown e usamos com cuidado
// (a API é validada à parte contra os tipos reais do Phaser).
/* eslint-disable @typescript-eslint/no-explicit-any */
declare global {
  interface Window {
    Phaser?: any;
  }
}

let phaserLoader: Promise<any> | null = null;
function loadPhaser(): Promise<any> {
  if (typeof window === "undefined") return Promise.reject(new Error("sem window"));
  if (window.Phaser) return Promise.resolve(window.Phaser);
  if (phaserLoader) return phaserLoader;
  phaserLoader = new Promise((resolve, reject) => {
    const s = document.createElement("script");
    s.src = PHASER_SRC;
    s.async = true;
    s.onload = () => (window.Phaser ? resolve(window.Phaser) : reject(new Error("Phaser não carregou")));
    s.onerror = () => reject(new Error("Falha ao baixar o Phaser"));
    document.head.appendChild(s);
  });
  return phaserLoader;
}

export function GameCanvas({
  atlasUrl,
  controls,
  onNearChange,
  onInteract,
}: {
  atlasUrl: string;
  controls: React.RefObject<Controls>;
  onNearChange: (near: boolean) => void;
  onInteract: () => void;
}) {
  const hostRef = useRef<HTMLDivElement>(null);
  // callbacks sempre atuais dentro do closure da cena
  const onNearRef = useRef(onNearChange);
  const onInteractRef = useRef(onInteract);
  onNearRef.current = onNearChange;
  onInteractRef.current = onInteract;

  useEffect(() => {
    let game: any = null;
    let destroyed = false;

    loadPhaser()
      .then((Phaser) => {
        if (destroyed || !hostRef.current) return;

        let player: any;
        let keys: any;
        let desk: any;
        let near = false;
        let facing: Dir = "down";

        function preload(this: any) {
          this.load.spritesheet("player", atlasUrl, { frameWidth: 64, frameHeight: 64 });
        }

        function makeWalk(scene: any, dir: Dir) {
          const base = ROW[dir] * FRAMES_PER_DIR;
          scene.anims.create({
            key: `walk-${dir}`,
            frames: scene.anims.generateFrameNumbers("player", {
              frames: [base + 1, base + 2, base + 3, base + 4, base + 5, base + 6, base + 7, base + 8],
            }),
            frameRate: 10,
            repeat: -1,
          });
        }

        function create(this: any) {
          const W = this.scale.width;
          const H = this.scale.height;

          // chão de jardim + caminho simples (sem assets: formas do Phaser)
          this.add.rectangle(W / 2, H / 2, W, H, 0x6b8f4e); // grama
          this.add.rectangle(W / 2, H - 40, W, 80, 0x8a7a5c); // calçada da recepção

          // balcão da recepção + placa
          desk = this.add.rectangle(W / 2, 70, 180, 54, 0x5a3d2b).setStrokeStyle(3, 0x3a2619);
          this.add.rectangle(W / 2, 40, 150, 22, 0xf4ead2).setStrokeStyle(2, 0x3a2619);
          this.add
            .text(W / 2, 40, "RECEPÇÃO", { fontFamily: "monospace", fontSize: "14px", color: "#3a2619" })
            .setOrigin(0.5);

          (["down", "up", "left", "right"] as Dir[]).forEach((d) => makeWalk(this, d));

          player = this.physics.add.sprite(W / 2, H - 70, "player", ROW.up * FRAMES_PER_DIR);
          player.setCollideWorldBounds(true);
          player.body.setSize(20, 16).setOffset(22, 44); // pés, não o frame inteiro

          this.physics.world.setBounds(0, 0, W, H);

          keys = this.input.keyboard.addKeys({
            up: Phaser.Input.Keyboard.KeyCodes.UP,
            down: Phaser.Input.Keyboard.KeyCodes.DOWN,
            left: Phaser.Input.Keyboard.KeyCodes.LEFT,
            right: Phaser.Input.Keyboard.KeyCodes.RIGHT,
            w: Phaser.Input.Keyboard.KeyCodes.W,
            a: Phaser.Input.Keyboard.KeyCodes.A,
            s: Phaser.Input.Keyboard.KeyCodes.S,
            d: Phaser.Input.Keyboard.KeyCodes.D,
            interact: Phaser.Input.Keyboard.KeyCodes.SPACE,
            enter: Phaser.Input.Keyboard.KeyCodes.ENTER,
          });
        }

        function update(this: any) {
          if (!player) return;
          const c = controls.current ?? { up: false, down: false, left: false, right: false, interact: false };
          const left = keys.left.isDown || keys.a.isDown || c.left;
          const right = keys.right.isDown || keys.d.isDown || c.right;
          const up = keys.up.isDown || keys.w.isDown || c.up;
          const down = keys.down.isDown || keys.s.isDown || c.down;

          let vx = 0;
          let vy = 0;
          if (left) vx -= SPEED;
          if (right) vx += SPEED;
          if (up) vy -= SPEED;
          if (down) vy += SPEED;
          // normaliza diagonal pra não andar mais rápido
          if (vx !== 0 && vy !== 0) {
            vx *= 0.7071;
            vy *= 0.7071;
          }
          player.body.setVelocity(vx, vy);

          if (vx !== 0 || vy !== 0) {
            const dir: Dir = Math.abs(vx) > Math.abs(vy) ? (vx < 0 ? "left" : "right") : vy < 0 ? "up" : "down";
            facing = dir;
            player.anims.play(`walk-${dir}`, true);
          } else {
            player.anims.stop();
            player.setFrame(ROW[facing] * FRAMES_PER_DIR); // frame parado da direção
          }

          // proximidade da recepção
          const dist = Phaser.Math.Distance.Between(player.x, player.y, desk.x, desk.y + 30);
          const nowNear = dist < 60;
          if (nowNear !== near) {
            near = nowNear;
            onNearRef.current(near);
          }

          const pressed =
            Phaser.Input.Keyboard.JustDown(keys.interact) || Phaser.Input.Keyboard.JustDown(keys.enter) || c.interact;
          if (pressed && controls.current) controls.current.interact = false;
          if (pressed && near) onInteractRef.current();
        }

        game = new Phaser.Game({
          type: Phaser.AUTO,
          parent: hostRef.current,
          width: 480,
          height: 320,
          pixelArt: true,
          backgroundColor: "#6b8f4e",
          scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
          physics: { default: "arcade", arcade: { gravity: { x: 0, y: 0 }, debug: false } },
          scene: { preload, create, update },
        });
      })
      .catch((e) => console.error("[jogo] Phaser:", e));

    return () => {
      destroyed = true;
      if (game) game.destroy(true);
    };
  }, [atlasUrl, controls]);

  return <div ref={hostRef} className="h-full w-full [&>canvas]:mx-auto [&>canvas]:block" />;
}

export default GameCanvas;
