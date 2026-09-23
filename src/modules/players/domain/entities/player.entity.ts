import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  ValueTransformer,
} from 'typeorm';

// Postgres 'date' vuelve como Date (u ocasionalmente string) según el driver;
// lo normalizamos siempre a "YYYY-MM-DD" para que el front nunca tenga que
// lidiar con desfases de zona horaria.
const dateOnlyTransformer: ValueTransformer = {
  to: (value: string | null) => value,
  from: (value: Date | string | null) => {
    if (value == null) return null;
    if (value instanceof Date) return value.toISOString().slice(0, 10);
    return value;
  },
};

// Postgres 'numeric' vuelve como string para no perder precisión; lo pasamos
// a number para que el DTO sea consistente con heightCm.
const numericTransformer: ValueTransformer = {
  to: (value: number | null) => value,
  from: (value: string | null) => (value == null ? null : parseFloat(value)),
};

@Entity('players')
export class Player {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column({ name: 'image_url', nullable: true, type: 'text' })
  imageUrl: string | null;

  @Column({
    name: 'birth_date',
    type: 'date',
    nullable: true,
    transformer: dateOnlyTransformer,
  })
  birthDate: string | null;

  @Column({ name: 'height_cm', type: 'smallint', nullable: true })
  heightCm: number | null;

  @Column({
    name: 'weight_kg',
    type: 'numeric',
    precision: 4,
    scale: 1,
    nullable: true,
    transformer: numericTransformer,
  })
  weightKg: number | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
