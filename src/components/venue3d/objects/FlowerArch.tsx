'use client';

interface Props { posX: number; posZ: number; rotation: number; }

export function FlowerArch({ posX, posZ, rotation }: Props) {
  return (
    <group position={[posX, 0, posZ]} rotation={[0, rotation, 0]}>
      {/* Colunas */}
      {[-0.8, 0.8].map((x, i) => (
        <mesh key={i} position={[x, 1.5, 0]}>
          <boxGeometry args={[0.2, 3.0, 0.2]} />
          <meshStandardMaterial color='#228B22' />
        </mesh>
      ))}
      {/* Arco topo */}
      <mesh position={[0, 3.05, 0]}>
        <boxGeometry args={[1.9, 0.2, 0.2]} />
        <meshStandardMaterial color='#228B22' />
      </mesh>
      {/* Flores (blocos coloridos no arco) */}
      {[-0.6, -0.2, 0.2, 0.6].map((x, i) => (
        <mesh key={`f${i}`} position={[x, 3.2, 0]}>
          <boxGeometry args={[0.25, 0.25, 0.25]} />
          <meshStandardMaterial color={['#FF69B4', '#FF8C00', '#FF1493', '#FFF'][i]} />
        </mesh>
      ))}
      {/* Flores laterais */}
      {[-0.8, 0.8].map((x, i) =>
        [0.8, 1.6, 2.4].map((y, j) => (
          <mesh key={`sf${i}${j}`} position={[x, y, 0.12]}>
            <boxGeometry args={[0.2, 0.2, 0.2]} />
            <meshStandardMaterial color={['#FF69B4', '#FF8C00', '#FF1493'][j]} />
          </mesh>
        ))
      )}
    </group>
  );
}
