DROP TABLE IF EXISTS packs CASCADE;
DROP TABLE IF EXISTS batches CASCADE;
DROP TABLE IF EXISTS tahun_anggaran CASCADE;
DROP TABLE IF EXISTS target_pecahan CASCADE;
DROP TYPE IF EXISTS status_pack CASCADE;

CREATE TYPE status_pack AS ENUM (
    'DITUGASKAN',
    'PERLU_SORTIR',
    'SIAP_KEMAS',
    'DIKEMAS'
);

CREATE TABLE tahun_anggaran (
    id SERIAL PRIMARY KEY,
    tahun INTEGER NOT NULL UNIQUE,
    target_bilyet BIGINT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE target_pecahan (
    id SERIAL PRIMARY KEY,
    tahun_anggaran_id INTEGER REFERENCES tahun_anggaran(id) ON DELETE CASCADE,
    pecahan INTEGER NOT NULL,
    target INTEGER NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (tahun_anggaran_id, pecahan)
);

CREATE TABLE batches (
    id SERIAL PRIMARY KEY,
    tahun_anggaran_id INTEGER REFERENCES tahun_anggaran(id) ON DELETE CASCADE,
    batch VARCHAR(50) NOT NULL UNIQUE,
    pecahan VARCHAR(10) NOT NULL,
    seri VARCHAR(10) NOT NULL,
    kepala VARCHAR(10) NOT NULL,
    tahun_emisi INTEGER NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE packs (
    id BIGSERIAL PRIMARY KEY,
    batch_id INTEGER REFERENCES batches(id) ON DELETE CASCADE,
    nomor_pack INTEGER NOT NULL,
    status status_pack NOT NULL DEFAULT 'DITUGASKAN',
    jumlah_bilyet INTEGER DEFAULT 45000,
    no_segel_masuk VARCHAR(50),
    waktu_terima TIMESTAMP,

    CONSTRAINT cek_nomor CHECK (nomor_pack BETWEEN 1 AND 100),
    UNIQUE (batch_id, nomor_pack)
);


CREATE OR REPLACE FUNCTION generate_100_packs()
RETURNS TRIGGER AS $$
BEGIN
    FOR i IN 1..100 LOOP
        INSERT INTO packs (batch_id, nomor_pack, status)
        VALUES (NEW.id, i, 'DITUGASKAN');
    END LOOP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_create_packs
AFTER INSERT ON batches
FOR EACH ROW
EXECUTE FUNCTION generate_100_packs();