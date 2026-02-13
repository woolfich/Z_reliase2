'use client';

import React, { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ArrowLeft, Plus, Trash2, User, Info, Clock } from 'lucide-react';
import { 
  Welder, 
  WorkRecord, 
  AppState, 
  formatArticle, 
  formatNumber, 
  getCurrentDate,
  calculateWorkTime 
} from '@/types';
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
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';

interface WelderCardProps {
  welder: Welder;
  state: AppState;
  onNavigate: () => void;
}

const WORKDAY_HOURS = 8;

export default function WelderCard({ welder, state, onNavigate }: WelderCardProps) {
  const [article, setArticle] = useState('');
  const [quantity, setQuantity] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [showStats, setShowStats] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<WorkRecord | null>(null);
  const [showOvertimeDialog, setShowOvertimeDialog] = useState(false);
  const [longPressTimer, setLongPressTimer] = useState<NodeJS.Timeout | null>(null);
  const [overtimeInput, setOvertimeInput] = useState('');
  const [error, setError] = useState('');

  const currentDate = getCurrentDate();

  const addWorkRecord = useAppStore((state) => state.addWorkRecord);
  const deleteWorkRecord = useAppStore((state) => state.deleteWorkRecord);
  const updateOvertime = useAppStore((state) => state.updateOvertime);
  const applyOvertime = useAppStore((state) => state.useOvertime);

  const suggestions = useMemo(() => {
    if (!article.trim()) return state.plan.filter(p => !p.isLocked);
    const search = article.toUpperCase();
    return state.plan
      .filter(p => p.article.includes(search) && !p.isLocked)
      .slice(0, 5);
  }, [article, state.plan]);

  const todayRecords = useMemo(() => {
    return welder.workRecords
      .filter(r => r.date === currentDate)
      .sort((a, b) => b.createdAt - a.createdAt);
  }, [welder.workRecords, currentDate]);

  const todayWorkTime = useMemo(() => {
    return todayRecords.reduce((sum, record) => {
      return sum + calculateWorkTime(record.article, record.quantity, state.norms);
    }, 0);
  }, [todayRecords, state.norms]);

  const todayAdjustment = useMemo(() => {
    return welder.timeAdjustments?.[currentDate] || 0;
  }, [welder.timeAdjustments, currentDate]);

  const todayTime = todayWorkTime + todayAdjustment;

  const availableToAdd = useMemo(() => {
    if (welder.overtime <= 0) return 0;
    const remaining = WORKDAY_HOURS - todayTime;
    return Math.min(welder.overtime, Math.max(0, remaining));
  }, [welder.overtime, todayTime]);

  const articleStats = useMemo(() => {
    if (!article.trim()) return null;
    const art = formatArticle(article);
    const planItem = state.plan.find(p => p.article === art);
    if (!planItem) return null;

    const welderStats = state.welders.map(w => {
      const records = w.workRecords.filter(r => r.article === art);
      const totalQty = records.reduce((sum, r) => sum + r.quantity, 0);
      return {
        welderId: w.id,
        welderName: w.name,
        quantity: totalQty,
      };
    }).filter(ws => ws.quantity > 0);

    return {
      article: art,
      totalPlanned: planItem.planned,
      totalCompleted: planItem.completed,
      welderStats,
    };
  }, [article, state.plan, state.welders]);

  const handleAddWork = () => {
    const formattedArticle = formatArticle(article.trim());
    const qty = parseFloat(quantity);

    if (!formattedArticle) {
      setError('Введите артикул');
      return;
    }

    const norm = state.norms.find(n => n.article === formattedArticle);
    if (!norm) {
      setError('Артикул не найден в нормах');
      return;
    }

    if (isNaN(qty) || qty <= 0) {
      setError('Введите корректное количество');
      return;
    }

    addWorkRecord(welder.id, formattedArticle, qty, state.norms);

    setArticle('');
    setQuantity('');
    setError('');
    setShowSuggestions(false);
  };

  const handleDeleteRecord = (record: WorkRecord) => {
    deleteWorkRecord(welder.id, record.id);
    setDeleteConfirm(null);
  };

  const handleUpdateOvertime = () => {
    const newOvertime = parseFloat(overtimeInput);
    if (isNaN(newOvertime) || newOvertime < 0) {
      setError('Введите корректное значение переработки');
      return;
    }
    
    updateOvertime(welder.id, newOvertime);
    setShowOvertimeDialog(false);
    setOvertimeInput('');
    setError('');
  };

  const handleUseOvertime = () => {
    if (availableToAdd > 0) {
      applyOvertime(welder.id, currentDate, availableToAdd);
    }
    setShowOvertimeDialog(false);
  };

  const handleSelectSuggestion = (art: string) => {
    setArticle(art);
    setShowSuggestions(false);
  };

  const handleTouchStart = (record: WorkRecord) => {
    const timer = setTimeout(() => {
      setDeleteConfirm(record);
    }, 500);
    setLongPressTimer(timer);
  };

  const handleTouchEnd = () => {
    if (longPressTimer) {
      clearTimeout(longPressTimer);
      setLongPressTimer(null);
    }
  };

  const allRecords = [...welder.workRecords].sort((a, b) => b.createdAt - a.createdAt);

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      <div className="bg-white shadow-sm border-b border-gray-200 p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center">
              <User className="h-6 w-6 text-emerald-600" />
            </div>
            <h2 className="text-xl font-bold text-gray-800">{welder.name}</h2>
          </div>
          <div className="text-right">
            <p className="text-sm text-gray-500">Сегодня</p>
            <p className={`text-lg font-semibold ${todayTime > WORKDAY_HOURS ? 'text-amber-600' : 'text-gray-800'}`}>
              {formatNumber(todayTime)} ч
            </p>
          </div>
        </div>

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
            
            {showSuggestions && suggestions.length > 0 && (
              <div className="absolute top-full left-0 right-0 z-10 mt-1 bg-white rounded-lg shadow-lg border border-gray-200 max-h-48 overflow-y-auto">
                {suggestions.map((s) => {
                  const remaining = s.planned - s.completed;
                  return (
                    <button
                      key={s.id}
                      className="w-full px-4 py-3 text-left hover:bg-gray-100 border-b border-gray-100 last:border-0"
                      onClick={() => handleSelectSuggestion(s.article)}
                    >
                      <div className="flex justify-between items-center">
                        <span className="font-semibold">{s.article}</span>
                        <Badge variant="outline">Ост: {formatNumber(remaining)} шт</Badge>
                      </div>
                    </button>
                  );
                })}
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
            onClick={handleAddWork}
            size="lg"
            className="bg-emerald-600 hover:bg-emerald-700"
          >
            <Plus className="h-5 w-5" />
          </Button>
        </div>

        {articleStats && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowStats(true)}
            className="w-full"
          >
            <Info className="mr-2 h-4 w-4" />
            Статистика по {articleStats.article}
          </Button>
        )}
        
        {error && <p className="text-red-500 text-sm">{error}</p>}
      </div>

      <div className="flex-1 flex overflow-hidden">
        <ScrollArea className="flex-1 p-4">
          {todayRecords.length === 0 && todayAdjustment === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-400">
              <Clock className="h-16 w-16 mb-4" />
              <p className="text-lg">Нет записей за сегодня</p>
              <p className="text-sm">Добавьте выполненную работу</p>
            </div>
          ) : (
            <div className="space-y-2">
              <h3 className="text-sm font-medium text-gray-500 mb-3">Сегодняшние работы</h3>
              
              {todayAdjustment > 0 && (
                <div className="bg-amber-50 rounded-xl p-4 border border-amber-200">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center">
                        <Clock className="h-5 w-5 text-amber-600" />
                      </div>
                      <div>
                        <h4 className="font-semibold text-amber-700">Из переработки</h4>
                        <p className="text-sm text-amber-600">+{formatNumber(todayAdjustment)} ч</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}
              
              {todayRecords.map((record) => {
                const norm = state.norms.find(n => n.article === record.article);
                const time = norm ? norm.timePerUnit * record.quantity : 0;
                
                return (
                  <div
                    key={record.id}
                    onTouchStart={() => handleTouchStart(record)}
                    onTouchEnd={handleTouchEnd}
                    onMouseDown={() => handleTouchStart(record)}
                    onMouseUp={handleTouchEnd}
                    onMouseLeave={handleTouchEnd}
                    className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 active:scale-[0.98] transition-transform cursor-pointer hover:shadow-md"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                          <span className="font-bold text-blue-600 text-sm">{record.article.slice(0, 3)}</span>
                        </div>
                        <div>
                          <h4 className="font-semibold text-gray-800">{record.article}</h4>
                          <p className="text-sm text-gray-500">{formatNumber(record.quantity)} шт</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium text-gray-600">{formatNumber(time)} ч</p>
                      </div>
                    </div>
                  </div>
                );
              })}

              {allRecords.filter(r => r.date !== currentDate).length > 0 && (
                <>
                  <h3 className="text-sm font-medium text-gray-500 mt-6 mb-3">Предыдущие записи</h3>
                  {allRecords.filter(r => r.date !== currentDate).slice(0, 10).map((record) => {
                    const norm = state.norms.find(n => n.article === record.article);
                    const time = norm ? norm.timePerUnit * record.quantity : 0;
                    
                    return (
                      <div
                        key={record.id}
                        onTouchStart={() => handleTouchStart(record)}
                        onTouchEnd={handleTouchEnd}
                        onMouseDown={() => handleTouchStart(record)}
                        onMouseUp={handleTouchEnd}
                        onMouseLeave={handleTouchEnd}
                        className="bg-gray-100 rounded-xl p-4 active:scale-[0.98] transition-transform cursor-pointer"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-gray-200 flex items-center justify-center">
                              <span className="font-bold text-gray-500 text-sm">{record.article.slice(0, 3)}</span>
                            </div>
                            <div>
                              <h4 className="font-semibold text-gray-600">{record.article}</h4>
                              <p className="text-sm text-gray-400">{formatNumber(record.quantity)} шт • {record.date}</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-sm text-gray-500">{formatNumber(time)} ч</p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </>
              )}
            </div>
          )}
        </ScrollArea>

        {welder.overtime > 0 && (
          <div
            onClick={() => {
              if (availableToAdd > 0) {
                setShowOvertimeDialog(true);
              } else {
                setShowOvertimeEditDialog(true);
              }
            }}
            onTouchStart={(e) => {
              e.preventDefault(); // Предотвращаем стандартное поведение
              if (availableToAdd > 0) {
                setShowOvertimeDialog(true);
              } else {
                setShowOvertimeEditDialog(true);
              }
            }}
            onTouchEnd={(e) => {
              e.preventDefault(); // Предотвращаем стандартное поведение
              if (availableToAdd > 0) {
                setShowOvertimeDialog(true);
              } else {
                setShowOvertimeEditDialog(true);
              }
            }}
            className={`px-3 py-1 bg-amber-100 rounded-full self-start mt-2 ${availableToAdd > 0 || welder.overtime > 0 ? 'cursor-pointer hover:bg-amber-200 active:scale-95 transition-all' : ''}`}
          >
            <span className="text-sm font-medium text-amber-700">Переработка {formatNumber(welder.overtime)} ч</span>
            {availableToAdd > 0 && (
              <span className="text-xs text-amber-600 block text-center">+{formatNumber(availableToAdd)} ч</span>
            )}
          </div>
        )}
      </div>

      <div className="bg-white border-t border-gray-200 p-4">
        <Button variant="outline" onClick={onNavigate} className="w-full h-14 text-lg font-medium">
          <ArrowLeft className="mr-2 h-5 w-5" />
          На Главную
        </Button>
      </div>

      <AlertDialog open={showOvertimeDialog} onOpenChange={setShowOvertimeDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Добавить к рабочему времени?</AlertDialogTitle>
            <AlertDialogDescription>
              Добавить {formatNumber(availableToAdd)} ч из переработки к сегодняшнему дню?
              <br />
              <span className="text-gray-500">
                Рабочее время станет: {formatNumber(todayTime)} + {formatNumber(availableToAdd)} = {formatNumber(todayTime + availableToAdd)} ч
              </span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Нет</AlertDialogCancel>
            <AlertDialogAction onClick={handleUseOvertime} className="bg-emerald-600 hover:bg-emerald-700">
              Да
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={showStats} onOpenChange={setShowStats}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Статистика: {articleStats?.article}</DialogTitle>
          </DialogHeader>
          {articleStats && (
            <div className="space-y-4 py-4">
              <div className="flex justify-between items-center p-3 bg-gray-100 rounded-lg">
                <span className="text-gray-600">План</span>
                <span className="font-bold">{formatNumber(articleStats.totalPlanned)} шт</span>
              </div>
              <div className="flex justify-between items-center p-3 bg-emerald-50 rounded-lg">
                <span className="text-emerald-600">Выполнено</span>
                <span className="font-bold text-emerald-600">{formatNumber(articleStats.totalCompleted)} шт</span>
              </div>
              <div className="flex justify-between items-center p-3 bg-blue-50 rounded-lg">
                <span className="text-blue-600">Осталось</span>
                <span className="font-bold text-blue-600">{formatNumber(articleStats.totalPlanned - articleStats.totalCompleted)} шт</span>
              </div>
              
              {articleStats.welderStats.length > 0 && (
                <div className="mt-4">
                  <h4 className="text-sm font-medium text-gray-500 mb-2">Кто сварил:</h4>
                  <div className="space-y-2">
                    {articleStats.welderStats.map((ws) => (
                      <div key={ws.welderId} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                        <span>{ws.welderName}</span>
                        <Badge variant="secondary">{formatNumber(ws.quantity)} шт</Badge>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Удалить запись?</AlertDialogTitle>
            <AlertDialogDescription>
              Вы уверены, что хотите удалить запись &quot;{deleteConfirm?.article} {formatNumber(deleteConfirm?.quantity || 0)} шт&quot;?
              <br />
              <span className="text-amber-600">План будет скорректирован.</span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Отмена</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteConfirm && handleDeleteRecord(deleteConfirm)}
              className="bg-red-600 hover:bg-red-700"
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Удалить
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Диалог редактирования переработки */}
      <Dialog open={showOvertimeDialog} onOpenChange={setShowOvertimeDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Редактировать переработку</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Переработка (ч)</label>
              <Input
                type="number"
                placeholder="Часы переработки"
                value={overtimeInput}
                onChange={(e) => {
                  setOvertimeInput(e.target.value);
                  setError('');
                }}
                className="text-lg"
                step="0.01"
                min="0"
              />
            </div>
            {error && <p className="text-red-500 text-sm">{error}</p>}
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setShowOvertimeDialog(false);
                setOvertimeInput('');
                setError('');
              }}
              className="flex-1"
            >
              Отмена
            </Button>
            <Button
              onClick={handleUpdateOvertime}
              className="flex-1 bg-emerald-600 hover:bg-emerald-700"
            >
              Сохранить
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}