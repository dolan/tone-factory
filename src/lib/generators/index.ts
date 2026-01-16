import type { GeneratorConfig, AlgorithmType, Sequence } from '../theory/types';
import { ScaleRunGenerator } from './scale-runs';
import { ArpeggioGenerator } from './arpeggios';
import { MotifGenerator } from './motif';
import type { GeneratorResult } from './base';

export { ScaleRunGenerator } from './scale-runs';
export { ArpeggioGenerator } from './arpeggios';
export { MotifGenerator } from './motif';
export type { GeneratorResult } from './base';

// Factory function to create the appropriate generator
export function createGenerator(
  algorithm: AlgorithmType,
  config: GeneratorConfig
) {
  switch (algorithm) {
    case 'scale-run':
      return new ScaleRunGenerator(config);
    case 'arpeggio':
      return new ArpeggioGenerator(config);
    case 'motif':
      return new MotifGenerator(config);
    default:
      return new ScaleRunGenerator(config);
  }
}

// Main generation function
export function generateLick(
  algorithm: AlgorithmType,
  config: GeneratorConfig
): Sequence {
  const generator = createGenerator(algorithm, config);
  const result = generator.generate();

  return {
    notes: result.notes,
    key: config.key,
    scale: config.scale,
    tempo: config.tempo,
    lengthBars: config.lengthBars,
    algorithm: result.algorithm
  };
}
