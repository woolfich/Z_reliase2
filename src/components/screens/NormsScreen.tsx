'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ArrowLeft, Plus, Trash2, Clock } from 'lucide-react';
import { Norm, AppState, formatArticle, formatNumber, isValidArticle } from '@/types';
import { useAppStore } from '@/hooks/useAppStore';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';

interface NormsScreenProps {
  state: AppState;
  onNavigate: () => void;
}

export default function NormsScreen({ state, onNavigate }: NormsScreenProps) {
  const [article, setArticle] = useState('');
  const [timePerUnit, setTimePerUnit] = useState('');
  const [editNorm, setEditNorm] = useState<Norm | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<Norm | null>(null);
  const [longPressTimer, setLongPressTimer] = useState<NodeJS.Timeout | null>(null);
  const [error, setError] = useState('');

  // Получаем actions из store
  const addNorm = useAppStore((state) => state.addNorm);
  const updateNorm = useAppStore((state) => state.updateNorm);
  const deleteNormAction = useAppStore((state) => state.deleteNorm);

  // Добавление или обновление нормы
  const handleSaveNorm = () => {
    const formattedArticle = formatArticle(article.trim());
    const time = parseFloat(timePerUnit);

    if (!formattedArticle || !isValidArticle(formattedArticle)) {
      setError('Введите корректный артикул (буквы и цифры)');
      return;
    }

    if (isNaN(time) || time <= 0) {
      setError('Введите корректную норму времени');
      return;
    }

    // Проверка на дубликат
    const existingNorm = state.norms.find(
      n => n.article === formattedArticle && n.id !== editNorm?.id
    );
    if (existingNorm) {
      setError('Норма с таким артикулом уже существует');
      return;
    }

    if (editNorm) {
      updateNorm(editNorm.id, formattedArticle, time);
    } else {
      addNorm(formattedArticle, time);
    }

    setArticle('');
    setTimePerUnit('');
    setEditNorm(null);
    setError('');
  };

  // Удаление нормы
  const handleDeleteNorm = (norm: Norm) => {
    deleteNormAction(norm.id);
    setDeleteConfirm(null);
  };

  // Начало редактирования
  const handleStartEdit = (norm: Norm) => {
    setEditNorm(norm);
    setArticle(norm.article);
    setTimePerUnit(norm.timePerUnit.toString());
    setError('');
  };

  // Обработка длинного тапа
  const handleTouchStart = (norm: Norm) => {
    const timer = setTimeout(() => {
      setDeleteConfirm(norm);
    }, 500);
    setLongPressTimer(timer);
  };

  const handleTouchEnd = () => {
    if (longPressTimer) {
      clearTimeout(longPressTimer);
      setLongPressTimer(null);
    }
  };

  // Сортировка норм по последнему изменению
  const sortedNorms = [...state.norms].sort((a, b) => b.updatedAt - a.updatedAt);

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      {/* Верхняя панель */}
      <div className="bg-white shadow-sm border-b border-gray-200 p-4 space-y-3">
        <div className="flex gap-2">
          <Input
            type="text"
            placeholder="Артикул (ХТ44)"
            value={article}
            onChange={(e) => {
              setArticle(e.target.value.toUpperCase());
              setError('');
            }}
            className="flex-1 text-lg uppercase"
          />
          <Input
            type="number"
            placeholder="Норма (ч)"
            value={timePerUnit}
            onChange={(e) => {
              setTimePerUnit(e.target.value);
              setError('');
            }}
            className="w-28 text-lg"
            step="0.01"
            min="0"
          />
          <Button
            onClick={handleSaveNorm}
            size="lg"
            className="bg-emerald-600 hover:bg-emerald-700"
          >
            <Plus className="h-5 w-5" />
          </Button>
        </div>
        
        {error && (
          <p className="text-red-500 text-sm">{error}</p>
        )}
      </div>

      {/* Список норм */}
      <ScrollArea className="flex-1 p-4">
        {sortedNorms.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-400">
            <Clock className="h-16 w-16 mb-4" />
            <p className="text-lg">Нет норм</p>
            <p className="text-sm">Добавьте первую норму времени</p>
          </div>
        ) : (
          <div className="space-y-2">
            {sortedNorms.map((norm) => (
              <div
                key={norm.id}
                onTouchStart={() => handleTouchStart(norm)}
                onTouchEnd={handleTouchEnd}
                onMouseDown={() => handleTouchStart(norm)}
                onMouseUp={handleTouchEnd}
                onMouseLeave={handleTouchEnd}
                onClick={() => handleStartEdit(norm)}
                className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 
                         active:scale-[0.98] transition-transform cursor-pointer
                         hover:shadow-md hover:border-emerald-200"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-blue-100 
                                  flex items-center justify-center">
                      <Clock className="h-6 w-6 text-blue-600" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-gray-800">
                        {norm.article}
                      </h3>
                      <p className="text-sm text-gray-500">
                        Норма: {formatNumber(norm.timePerUnit)} ч/шт
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </ScrollArea>

      {/* Нижняя панель */}
      <div className="bg-white border-t border-gray-200 p-4">
        <Button 
          variant="outline"
          onClick={onNavigate}
          className="w-full h-14 text-lg font-medium"
        >
          <ArrowLeft className="mr-2 h-5 w-5" />
          На Главную
        </Button>
      </div>

      {/* Диалог редактирования */}
      <Dialog open={!!editNorm} onOpenChange={() => {
        setEditNorm(null);
        setArticle('');
        setTimePerUnit('');
        setError('');
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Редактирование нормы</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Артикул</label>
              <Input
                type="text"
                placeholder="Артикул (ХТ44)"
                value={article}
                onChange={(e) => {
                  setArticle(e.target.value.toUpperCase());
                  setError('');
                }}
                className="text-lg uppercase"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Норма времени (ч)</label>
              <Input
                type="number"
                placeholder="Норма (ч)"
                value={timePerUnit}
                onChange={(e) => {
                  setTimePerUnit(e.target.value);
                  setError('');
                }}
                className="text-lg"
                step="0.01"
                min="0"
              />
            </div>
            {error && <p className="text-red-500 text-sm">{error}</p>}
          </div>
          <DialogFooter className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setEditNorm(null);
                setArticle('');
                setTimePerUnit('');
                setError('');
              }}
              className="flex-1"
            >
              Отмена
            </Button>
            <Button
              onClick={handleSaveNorm}
              className="flex-1 bg-emerald-600 hover:bg-emerald-700"
            >
              Сохранить
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Диалог подтверждения удаления */}
      <AlertDialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Удалить норму?</AlertDialogTitle>
            <AlertDialogDescription>
              Вы уверены, что хотите удалить норму &quot;{deleteConfirm?.article}&quot;?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Отмена</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteConfirm && handleDeleteNorm(deleteConfirm)}
              className="bg-red-600 hover:bg-red-700"
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Удалить
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
