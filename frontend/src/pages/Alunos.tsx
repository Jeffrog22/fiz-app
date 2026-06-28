import React, { useState, useEffect, useCallback } from 'react';
import api from '../utils/api';
import AlunoModal from '../components/modals/AlunoModal';
import type { Aluno } from '../types';

function calcularIdade(dataNascimento?: string): number | null {
  if (!dataNascimento) return null;
  const nasc = new Date(dataNascimento + 'T12:00:00');
  const hoje = new Date();
  let idade = hoje.getFullYear() - nasc.getFullYear();
  const mes = hoje.getMonth() - nasc.getMonth();
  if (mes < 0 || (mes === 0 && hoje.getDate() < nasc.getDate())) idade--;
  return idade;
}

const Alunos: React.FC = () => {
  const [alunos, setAlunos] = useState<any[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [filtro, setFiltro] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editando, setEditando] = useState<Aluno | null>(null);

  const carregar = useCallback(async () => {
    setCarregando(true);
    try {
      const res = await api.get('/alunos');
      setAlunos(res.data);
    } catch (err) {
      console.error('Erro ao carregar alunos', err);
    } finally {
      setCarregando(false);
    }
  }, []);

  useEffect(() => { carregar(); }, [carregar]);

  const handleSave = async (data: Partial<Aluno>) => {
    try {
      if (editando) {
        await api.put(`/alunos/${editando.id}`, data);
      } else {
        await api.post('/alunos', data);
      }
      setModalOpen(false);
      setEditando(null);
      await carregar();
    } catch (err) {
      console.error('Erro ao salvar aluno', err);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Remover este aluno?')) return;
    try {
      await api.delete(`/alunos/${id}`);
      await carregar();
    } catch (err) {
      console.error('Erro ao remover aluno', err);
    }
  };

  const filtered = alunos.filter((a: any) =>
    a.nome.toLowerCase().includes(filtro.toLowerCase())
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-800">Alunos</h1>
        <button
          onClick={() => { setEditando(null); setModalOpen(true); }}
          className="px-4 py-2 text-sm bg-primary-600 text-white rounded-md hover:bg-primary-700 transition-colors"
        >
          + Novo Aluno
        </button>
      </div>

      <input
        type="text"
        placeholder="Buscar por nome..."
        value={filtro}
        onChange={(e) => setFiltro(e.target.value)}
        className="w-full max-w-xs px-3 py-1.5 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
      />

      {carregando ? (
        <p className="text-sm text-gray-500">Carregando...</p>
      ) : (
        <div className="bg-white rounded-lg border border-gray-200 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left px-3 py-2 font-medium text-gray-500">Nome</th>
                <th className="text-left px-3 py-2 font-medium text-gray-500">Nivel</th>
                <th className="text-left px-3 py-2 font-medium text-gray-500">Idade</th>
                <th className="text-left px-3 py-2 font-medium text-gray-500">Categoria</th>
                <th className="text-left px-3 py-2 font-medium text-gray-500">Turma</th>
                <th className="text-left px-3 py-2 font-medium text-gray-500">Horario</th>
                <th className="text-left px-3 py-2 font-medium text-gray-500">Contato</th>
                <th className="text-left px-3 py-2 font-medium text-gray-500">Status</th>
                <th className="text-right px-3 py-2 font-medium text-gray-500">Acoes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map((a: any) => {
                const idade = calcularIdade(a.data_nascimento);
                return (
                  <tr key={a.id} className="hover:bg-gray-50">
                    <td className="px-3 py-2 font-medium text-gray-800">{a.nome}</td>
                    <td className="px-3 py-2 text-gray-600">{a.nivel || '-'}</td>
                    <td className="px-3 py-2 text-gray-600">{idade !== null ? idade : '-'}</td>
                    <td className="px-3 py-2 text-gray-600">{a.categoria || '-'}</td>
                    <td className="px-3 py-2 text-gray-600">{a.turmas?.label || '-'}</td>
                    <td className="px-3 py-2 text-gray-600">{a.turmas?.horario || '-'}</td>
                    <td className="px-3 py-2 text-gray-600">{a.contato || '-'}</td>
                    <td className="px-3 py-2">
                      <span className={'text-xs font-medium px-2 py-0.5 rounded-full ' + (
                        a.ativo ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                      )}>
                        {a.ativo ? 'Ativo' : 'Inativo'}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-right space-x-2 whitespace-nowrap">
                      <button onClick={() => { setEditando(a); setModalOpen(true); }}
                        className="text-xs text-primary-600 hover:text-primary-800">Editar</button>
                      <button onClick={() => handleDelete(a.id)}
                        className="text-xs text-red-500 hover:text-red-700">Remover</button>
                    </td>
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={9} className="px-4 py-8 text-center text-gray-400">
                    Nenhum aluno encontrado
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      <AlunoModal
        open={modalOpen}
        aluno={editando}
        onSave={handleSave}
        onClose={() => { setModalOpen(false); setEditando(null); }}
      />
    </div>
  );
};

export default Alunos;
