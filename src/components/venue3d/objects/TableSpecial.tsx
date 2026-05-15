'use client';

// Mesas em formato especial: U, C, T (vista de cima)
type SpecialShape = 'U' | 'C' | 'T';

interface Props {
  posX: number; posZ: number; rotation: number;
  shape: SpecialShape; color?: string; chairColor?: string;
}

const TABLE_H = 0.74;
const SLAB_H = 0.08;
const SLAB_W = 0.9;
const CHAIR_W = 0.42;
const CHAIR_H = 0.07;

function Slab({ lx, lz, px, pz, color }: { lx: number; lz: number; px: number; pz: number; color: string }) {
  return (
    <mesh position={[px, TABLE_H, pz]}>
      <boxGeometry args={[lx, SLAB_H, lz]} />
      <meshStandardMaterial color={color} />
    </mesh>
  );
}

function Chair({ px, pz, color }: { px: number; pz: number; color: string }) {
  return (
    <mesh position={[px, 0.22, pz]}>
      <boxGeometry args={[CHAIR_W, CHAIR_H, CHAIR_W]} />
      <meshStandardMaterial color={color} />
    </mesh>
  );
}

export function TableSpecial({ posX, posZ, rotation, shape, color = '#C8A96A', chairColor = '#7B4F2E' }: Props) {
  return (
    <group position={[posX, 0, posZ]} rotation={[0, rotation, 0]}>
      {shape === 'U' && (
        <>
          {/* U: braço esquerdo, frente, braço direito */}
          <Slab lx={SLAB_W} lz={2.5} px={-1.5} pz={0.5} color={color} />
          <Slab lx={3.0} lz={SLAB_W} px={0} pz={1.7} color={color} />
          <Slab lx={SLAB_W} lz={2.5} px={1.5} pz={0.5} color={color} />
          {/* Cadeiras externas do U */}
          {[-2.2, 2.2].map((cx, i) =>
            [-0.6, 0, 0.6].map((cz, j) => <Chair key={`${i}${j}`} px={cx} pz={cz} color={chairColor} />)
          )}
          {[-0.8, 0, 0.8].map((cx, i) => <Chair key={`front${i}`} px={cx} pz={2.4} color={chairColor} />)}
          {/* Cadeiras internas (noivos) do lado de dentro */}
          {[-0.8, 0, 0.8].map((cx, i) => <Chair key={`in${i}`} px={cx} pz={0.9} color={chairColor} />)}
        </>
      )}
      {shape === 'C' && (
        <>
          <Slab lx={SLAB_W} lz={2.0} px={-1.5} pz={0} color={color} />
          <Slab lx={3.0} lz={SLAB_W} px={0} pz={1.2} color={color} />
          <Slab lx={3.0} lz={SLAB_W} px={0} pz={-1.2} color={color} />
          {[-2.2].map((cx) =>
            [-0.5, 0.5].map((cz, j) => <Chair key={`c${j}`} px={cx} pz={cz} color={chairColor} />)
          )}
          {[-0.8, 0, 0.8].map((cx, i) => <Chair key={`top${i}`} px={cx} pz={2.0} color={chairColor} />)}
          {[-0.8, 0, 0.8].map((cx, i) => <Chair key={`bot${i}`} px={cx} pz={-2.0} color={chairColor} />)}
        </>
      )}
      {shape === 'T' && (
        <>
          {/* T: barra horizontal no topo + haste vertical */}
          <Slab lx={4.0} lz={SLAB_W} px={0} pz={-1.5} color={color} />
          <Slab lx={SLAB_W} lz={2.5} px={0} pz={0.2} color={color} />
          {[-1.8, -0.9, 0, 0.9, 1.8].map((cx, i) => <Chair key={`top${i}`} px={cx} pz={-2.2} color={chairColor} />)}
          {[-2.2, 2.2].map((cx, i) => <Chair key={`end${i}`} px={cx} pz={-1.5} color={chairColor} />)}
          {[-0.6, 0.6].map((cx, i) => <Chair key={`stem${i}`} px={cx} pz={1.4} color={chairColor} />)}
        </>
      )}
    </group>
  );
}
