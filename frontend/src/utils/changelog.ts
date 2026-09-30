export interface ChangelogItem {
  titulo: string;
  detalhes: string[];
}

export interface ChangelogSecao {
  titulo: string;
  itens: ChangelogItem[];
}

export interface ChangelogVersao {
  version: string;
  date: string;
  secoes: ChangelogSecao[];
}

const RE_VERSAO = /^##\s*\[([^\]]+)\]\s*(?:-\s*(\d{4}-\d{2}-\d{2}))?/;
const RE_SECAO = /^###\s+(.+)$/;
const RE_ITEM_BOLD = /^-\s+\*\*(.+?)\*\*/;
const RE_ITEM = /^-\s+(.+)$/;
const RE_DETALHE = /^\s{2,}-\s+(.+)$/;

function limpar(texto: string): string {
  return texto.replace(/\s+$/, '').replace(/\s+/g, ' ');
}

export function parseChangelog(md: string, limite = 30): ChangelogVersao[] {
  const versoes: ChangelogVersao[] = [];
  let atual: ChangelogVersao | null = null;
  let secao: ChangelogSecao | null = null;
  let item: ChangelogItem | null = null;

  const garantirSecao = (): ChangelogSecao => {
    if (!atual) {
      atual = { version: 'dev', date: '', secoes: [] };
      versoes.push(atual);
    }
    if (!secao) {
      secao = { titulo: 'Alterações', itens: [] };
      atual.secoes.push(secao);
    }
    return secao;
  };

  for (const linha of md.split(/\r?\n/)) {
    const mVersao = RE_VERSAO.exec(linha);
    if (mVersao) {
      item = null;
      secao = null;
      atual = { version: mVersao[1].trim(), date: mVersao[2] || '', secoes: [] };
      versoes.push(atual);
      continue;
    }

    const mSecao = RE_SECAO.exec(linha);
    if (mSecao) {
      item = null;
      if (!atual) {
        atual = { version: 'dev', date: '', secoes: [] };
        versoes.push(atual);
      }
      secao = { titulo: limpar(mSecao[1]), itens: [] };
      atual.secoes.push(secao);
      continue;
    }

    const mDetalhe = RE_DETALHE.exec(linha);
    if (mDetalhe && item) {
      item.detalhes.push(limpar(mDetalhe[1]));
      continue;
    }

    const mBold = RE_ITEM_BOLD.exec(linha);
    if (mBold) {
      item = { titulo: limpar(mBold[1]), detalhes: [] };
      garantirSecao().itens.push(item);
      continue;
    }

    const mItem = RE_ITEM.exec(linha);
    if (mItem) {
      item = { titulo: limpar(mItem[1]), detalhes: [] };
      garantirSecao().itens.push(item);
      continue;
    }
  }

  return versoes.slice(0, limite);
}

export interface ChangelogArquivo {
  versions: ChangelogVersao[];
}

export async function buscarChangelog(): Promise<ChangelogVersao[] | null> {
  try {
    const res = await fetch('/changelog.json', { cache: 'no-store' });
    if (!res.ok) return null;
    const data = (await res.json()) as ChangelogArquivo;
    return Array.isArray(data.versions) ? data.versions : null;
  } catch {
    return null;
  }
}
