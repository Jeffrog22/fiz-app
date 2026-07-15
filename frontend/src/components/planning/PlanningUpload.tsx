import React, { useState, useRef, useCallback } from 'react';
import api from '../../utils/api';
import type { Planejamento } from '../../types';

const TIPOS_ACEITOS = '.pdf,.txt,.csv,.xls,.xlsx';
const MIME_ACEITOS = ['application/pdf', 'text/plain', 'text/csv', 'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'];

interface Props {
  arquivos: Planejamento[];
  onArquivosChange: () => void;
}

const formatarTamanho = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const iconeMime = (mime: string): string => {
  if (mime.includes('pdf')) return '📄';
  if (mime.includes('csv') || mime.includes('excel') || mime.includes('spreadsheet')) return '📊';
  if (mime.includes('text')) return '📝';
  return '📎';
};

const labelFromFilename = (nome: string): string => {
  const base = nome.replace(/\.(pdf|txt|csv|xls|xlsx)$/i, '');
  const parts = base.split('-');
  if (parts.length >= 2) {
    const ano = parts.pop();
    const tipo = parts.join('-');
    return `${tipo.charAt(0).toUpperCase() + tipo.slice(1)} Ano ${ano}`;
  }
  return base;
};

const PlanningUpload: React.FC<Props> = ({ arquivos, onArquivosChange }) => {
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleUpload = useCallback(async (files: FileList) => {
    const validos = Array.from(files).filter((f) => MIME_ACEITOS.includes(f.type));
    if (validos.length === 0) {
      alert('Tipo de arquivo nao permitido. Aceitos: PDF, TXT, CSV, XLS, XLSX');
      return;
    }
    setUploading(true);
    try {
      const formData = new FormData();
      for (const file of validos) {
        formData.append('arquivos', file);
      }
      await api.post('/planejamento/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      onArquivosChange();
    } catch {
      alert('Erro ao fazer upload');
    }
    setUploading(false);
  }, [onArquivosChange]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files) handleUpload(e.dataTransfer.files);
  }, [handleUpload]);

  const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); setDragOver(true); };
  const handleDragLeave = () => setDragOver(false);

  const handleInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) handleUpload(e.target.files);
    e.target.value = '';
  };

  const handleRemover = async (id: string) => {
    try {
      await api.delete(`/planejamento/${id}`);
      onArquivosChange();
    } catch { alert('Erro ao remover'); }
  };

  const handleDownload = async (item: Planejamento) => {
    try {
      const res = await api.get(`/planejamento/${item.id}/download`, { responseType: 'blob' });
      const url = URL.createObjectURL(res.data);
      const a = document.createElement('a');
      a.href = url;
      a.download = item.nome_original;
      a.click();
      URL.revokeObjectURL(url);
    } catch { alert('Erro ao baixar'); }
  };

  return (
    <div className="space-y-3">
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={() => inputRef.current?.click()}
        className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${
          dragOver ? 'border-primary-400 bg-primary-50' : 'border-gray-300 hover:border-gray-400 bg-gray-50'
        }`}
      >
        <input
          ref={inputRef}
          type="file"
          accept={TIPOS_ACEITOS}
          multiple
          onChange={handleInput}
          className="hidden"
        />
        <p className="text-sm text-gray-500">
          {uploading ? 'Enviando...' : 'Arraste arquivos ou clique para selecionar'}
        </p>
        <p className="text-xs text-gray-400 mt-1">PDF, TXT, CSV, XLS, XLSX (1 a 4 arquivos, até 10MB cada)</p>
      </div>

      {arquivos.length > 0 && (
        <ul className="text-xs text-gray-600 space-y-2">
          {arquivos.map((f) => (
            <li key={f.id} className="flex justify-between items-center py-1.5 px-2 rounded hover:bg-gray-50 border border-gray-100">
              <div className="flex items-center gap-1.5 min-w-0">
                <span>{iconeMime(f.tipo_mime || '')}</span>
                <span className="font-medium text-gray-700 truncate max-w-[160px]" title={f.nome_original}>
                  {labelFromFilename(f.nome_original)}
                </span>
                <span className="text-gray-400 shrink-0">{f.total_blocos} blocos</span>
                <span className="text-gray-400 shrink-0">({formatarTamanho(f.tamanho)})</span>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <button onClick={() => handleDownload(f)} className="text-primary-500 hover:text-primary-700 px-1" title="Download">⬇</button>
                <button onClick={() => handleRemover(f.id)} className="text-red-400 hover:text-red-600 px-1" title="Remover">&times;</button>
              </div>
            </li>
          ))}
        </ul>
      )}
      {arquivos.length === 0 && !uploading && (
        <p className="text-xs text-gray-400 text-center py-2">Nenhum arquivo de planejamento enviado.</p>
      )}
    </div>
  );
};

export default PlanningUpload;
