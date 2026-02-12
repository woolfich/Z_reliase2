'use client';

import React, { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ArrowLeft, Plus, Trash2, CheckCircle2, Circle, AlertCircle } from 'lucide-react';
import { PlanItem, AppState, formatArticle, formatNumber } from '@/types';
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
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';

interface PlanScreenProps {
  state: AppState;
  onNavigate: () => void;
}

export default function PlanScreen({ state, onNavigate }: PlanScreenProps) {
  const [article, setArticle] = useState('');
  const [quantity, setQuantity] = useState('');
  const [editPlan, setEditPlan] = useState<PlanItem | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<PlanItem | null>(null);
  const [longPressTimer, setLongPressTimer] = useState<NodeJS.Timeout | null>(null);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [error, setError] = useState('');

  // Получаем actions из store
  const addPlanItem = useAppStore((state) => state.addPlanItem);
  const updatePlanItem = useAppStore((state) => state.updatePlanItem);
  const deletePlanItemAction = useAppStore((state) => state.deletePlanItem);

  // Автоподсказки из норм
  const suggestions = useMemo(() => {
    if (!article.trim()) return [];
    const search = article.toUpperCase();
    return state.norms
      .filter(n => n.article.includes(search))
      .slice(0, 5);
  }, [article, state.norms]);

  // Проверка, есть ли артикул в нормах
  const isValidArticle = (art: string) => {
    return state.norms.some(n => n.article === art);
  };

  // Добавление или обновление позиции плана
  const handleSavePlan = () => {
    const formattedArticle = formatArticle(article.trim());
    const qty = parseFloat(quantity);

    if (!formattedArticle) {
      setError('Введите артикул');
      return;
    }

    if (!isValidArticle(formattedArticle)) {
      setError('Артикул не найден в нормах');
      return;
    }

    if (isNaN(qty) || qty <= 0) {
      setError('Введите корректное количество');
      return;
    }

    if (editPlan) {
      updatePlanItem(editPlan.id, qty);
    } else {
      addPlanItem(formattedArticle, qty);
    }

    setArticle('');
    setQuantity('');
    setEditPlan(null);
    setError('');
    setShowSuggestions(false);
  };

  // Удаление позиции плана
  const handleDeletePlan = (plan: PlanItem) => {
    deletePlanItemAction(plan.id);
    setDeleteConfirm(null);
  };

  // Начало редактирования
  const handleStartEdit = (plan: PlanItem) => {
    if (plan.isLocked) return; // Заблокированные нельзя редактировать
    setEditPlan(plan);
    setArticle(plan.article);
    setQuantity(plan.planned.toString());
    setError('');
  };

  // Обработка длинного тапа
  const handleTouchStart = (plan: PlanItem) => {
    const timer = setTimeout(() => {
      setDeleteConfirm(plan);
    }, 500);
    setLongPressTimer(timer);
  };

  const handleTouchEnd = () => {
    if (longPressTimer) {
      clearTimeout(longPressTimer);
      setLongPressTimer(null);
    }
  };

  // Выбор подсказки
  const handleSelectSuggestion = (art: string) => {
    setArticle(art);
    setShowSuggestions(false);
  };

  // Сортировка плана по последнему изменению
  const sortedPlan = [...state.plan].sort((a, b) => b.updatedAt - a.updatedAt);

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      {/* Верхняя панель */}
      <div className="bg-white shadow-sm border-b border-gray-200 p-4 space-y-3">
        <div className="flex gap-2 relative">
          <div className="flex-1 relative">
            <Input
              type="text"
              placeholder="Артикул"
              value={article}
              onChange={(e) => {
                setArticle(e.target.value.toUpperCase());
                setShowSuggestions(true);
                setError('');
              }}
              onFocus={() => setShowSuggestions(true)}
              onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
              className="text-lg uppercase"
            />
            
            {/* Подсказки */}
            {showSuggestions && suggestions.length > 0 && (
              <div className="absolute top-full left-0 right-0 z-10 mt-1 
                            bg-white rounded-lg shadow-lg border border-gray-200 max-h-48 overflow-y-auto">
                {suggestions.map((s) => (
                  <button
                    key={s.id}
                    className="w-full px-4 py-3 text-left hover:bg-gray-100 
                             border-b border-gray-100 last:border-0"
                    onClick={() => handleSelectSuggestion(s.article)}
                  >
                    <span className="font-semibold">{s.article}</span>
                    <span className="text-sm text-gray-500 ml-2">
                      ({formatNumber(s.timePerUnit)} ч/шт)
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
          
          <Input
            type="number"
            placeholder="Кол-во"
            value={quantity}
            onChange={(e) => {
              setQuantity(e.target.value);
              setError('');
            }}
            className="w-28 text-lg"
            step="0.01"
            min="0"
          />
          <Button
            onClick={handleSavePlan}
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

      {/* Список плана */}
      <ScrollArea className="flex-1 p-4">
        {sortedPlan.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-400">
            <AlertCircle className="h-16 w-16 mb-4" />
            <p className="text-lg">Нет плана</p>
            <p className="text-sm">Добавьте позиции из норм</p>
          </div>
        ) : (
          <div className="space-y-3">
            {sortedPlan.map((plan) => {
              const progress = plan.planned > 0 
                ? Math.min(100, (plan.completed / plan.planned) * 100) 
                : 0;
              const isComplete = plan.completed >= plan.planned && plan.planned > 0;
              const norm = state.norms.find(n => n.article === plan.article);
              
              return (
                <div
                  key={plan.id}
                  onTouchStart={() => handleTouchStart(plan)}
                  onTouchEnd={handleTouchEnd}
                  onMouseDown={() => handleTouchStart(plan)}
                  onMouseUp={handleTouchEnd}
                  onMouseLeave={handleTouchEnd}
                  onClick={() => handleStartEdit(plan)}
                  className={`rounded-xl p-4 shadow-sm border 
                           active:scale-[0.98] transition-transform cursor-pointer
                           hover:shadow-md ${
                             isComplete 
                               ? 'bg-emerald-50 border-emerald-200' 
                               : 'bg-white border-gray-100'
                           }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center
                                    ${isComplete ? 'bg-emerald-200' : 'bg-blue-100'}`}>
                        {isComplete ? (
                          <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                        ) : (
                          <Circle className="h-5 w-5 text-blue-600" />
                        )}
                      </div>
                      <div>
                        <h3 className={`text-lg font-semibold ${isComplete ? 'text-emerald-700' : 'text-gray-800'}`}>
                          {plan.article}
                        </h3>
                        <p className="text-sm text-gray-500">
                          {isComplete && plan.isLocked && (
                            <Badge variant="outline" className="mr-2 bg-emerald-100">
                              Выполнено
                            </Badge>
                          )}
                          {formatNumber(plan.completed)} / {formatNumber(plan.planned)} шт
                        </p>
                      </div>
                    </div>
                    {norm && (
                      <span className="text-sm text-gray-400">
                        {formatNumber(norm.timePerUnit)} ч/шт
                      </span>
                    )}
                  </div>
                  
                  <Progress 
                    value={progress} 
                    className={`h-2 ${isComplete ? 'bg-emerald-200' : ''}`}
                  />
                </div>
              );
            })}
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
      <Dialog open={!!editPlan} onOpenChange={() => {
        setEditPlan(null);
        setArticle('');
        setQuantity('');
        setError('');
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Редактирование плана</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Артикул</label>
              <Input
                type="text"
                placeholder="Артикул"
                value={article}
                onChange={(e) => {
                  setArticle(e.target.value.toUpperCase());
                  setError('');
                }}
                className="text-lg uppercase"
                disabled
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Плановое количество</label>
              <Input
                type="number"
                placeholder="Количество"
                value={quantity}
                onChange={(e) => {
                  setQuantity(e.target.value);
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
                setEditPlan(null);
                setArticle('');
                setQuantity('');
                setError('');
              }}
              className="flex-1"
            >
              Отмена
            </Button>
            <Button
              onClick={handleSavePlan}
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
            <AlertDialogTitle>Удалить позицию плана?</AlertDialogTitle>
            <AlertDialogDescription>
              Вы уверены, что хотите удалить позицию &quot;{deleteConfirm?.article}&quot;?
              {deleteConfirm?.completed && deleteConfirm.completed > 0 && (
                <span className="block mt-2 text-amber-600">
                  Внимание! Уже выполнено {formatNumber(deleteConfirm.completed)} шт.
                </span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Отмена</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteConfirm && handleDeletePlan(deleteConfirm)}
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
