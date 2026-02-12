'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Download, 
  Upload, 
  ClipboardList, 
  Ruler, 
  User, 
  Trash2,
  Plus
} from 'lucide-react';
import { Welder, AppState } from '@/types';
import { exportToJSON, importFromJSON } from '@/hooks/useLocalStorage';
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

interface MainScreenProps {
  state: AppState;
  onNavigate: (screen: 'norms' | 'plan' | 'welderCard', data?: unknown) => void;
}

export default function MainScreen({ state, onNavigate }: MainScreenProps) {
  const [welderName, setWelderName] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState<Welder | null>(null);
  const [longPressTimer, setLongPressTimer] = useState<NodeJS.Timeout | null>(null);

  const addWelder = useAppStore((state) => state.addWelder);
  const deleteWelder = useAppStore((state) => state.deleteWelder);
  const importData = useAppStore((state) => state.importData);

  const handleAddWelder = () => {
    const name = welderName.trim();
    if (!name) return;
    addWelder(name);
    setWelderName('');
  };

  const handleDeleteWelder = (welder: Welder) => {
    deleteWelder(welder.id);
    setDeleteConfirm(null);
  };

  const handleExport = () => {
    const exportData = {
      ...state,
      exportedAt: new Date().toISOString(),
    };
    exportToJSON(exportData, `welders-data-${new Date().toISOString().split('T')[0]}`);
  };

  const handleImport = async () => {
    try {
      const data = await importFromJSON<Partial<AppState>>();
      if (!data) return;
      importData(data);
    } catch (error) {
      console.error('Import error:', error);
      alert('Ошибка при импорте файла');
    }
  };

  const handleTouchStart = (welder: Welder) => {
    const timer = setTimeout(() => {
      setDeleteConfirm(welder);
    }, 500);
    setLongPressTimer(timer);
  };

  const handleTouchEnd = () => {
    if (longPressTimer) {
      clearTimeout(longPressTimer);
      setLongPressTimer(null);
    }
  };

  const sortedWelders = [...state.welders].sort((a, b) => b.updatedAt - a.updatedAt);

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      <div className="bg-white shadow-sm border-b border-gray-200 p-4 space-y-3">
        <div className="flex gap-2">
          <Input
            type="text"
            placeholder="Фамилия сварщика..."
            value={welderName}
            onChange={(e) => setWelderName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAddWelder()}
            className="flex-1 text-lg"
          />
          <Button
            onClick={handleAddWelder}
            size="lg"
            className="bg-emerald-600 hover:bg-emerald-700"
          >
            <Plus className="h-5 w-5" />
          </Button>
          <Button
            variant="outline"
            onClick={handleImport}
            size="lg"
            className="h-12"
          >
            <Upload className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            onClick={handleExport}
            size="lg"
            className="h-12"
          >
            <Download className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <ScrollArea className="flex-1 p-4">
        {sortedWelders.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-400">
            <User className="h-16 w-16 mb-4" />
            <p className="text-lg">Нет сварщиков</p>
            <p className="text-sm">Добавьте первого сварщика</p>
          </div>
        ) : (
          <div className="space-y-2">
            {sortedWelders.map((welder) => {
              const todayRecords = welder.workRecords.filter(
                r => r.date === new Date().toISOString().split('T')[0]
              );
              
              // Группируем по артикулам
              const articleGroups = todayRecords.reduce((acc, r) => {
                acc[r.article] = (acc[r.article] || 0) + r.quantity;
                return acc;
              }, {} as Record<string, number>);
              
              const articleList = Object.entries(articleGroups)
                .map(([article, qty]) => `${article} - ${qty.toFixed(2)} шт`)
                .slice(0, 3);
              const moreCount = Object.keys(articleGroups).length - 3;
              
              return (
                <div
                  key={welder.id}
                  onClick={() => onNavigate('welderCard', welder)}
                  onTouchStart={() => handleTouchStart(welder)}
                  onTouchEnd={handleTouchEnd}
                  onMouseDown={() => handleTouchStart(welder)}
                  onMouseUp={handleTouchEnd}
                  onMouseLeave={handleTouchEnd}
                  className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 
                           active:scale-[0.98] transition-transform cursor-pointer
                           hover:shadow-md hover:border-emerald-200"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-full bg-emerald-100 
                                    flex items-center justify-center">
                        <User className="h-6 w-6 text-emerald-600" />
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-gray-800">
                          {welder.name}
                        </h3>
                        {articleList.length > 0 && (
                          <p className="text-sm text-emerald-600">
                            Сегодня: {articleList.join(', ')}
                            {moreCount > 0 && ` + ещё ${moreCount}`}
                          </p>
                        )}
                      </div>
                    </div>
                    {welder.overtime > 0 && (
                      <div className="px-3 py-1 bg-amber-100 rounded-full">
                        <span className="text-sm font-medium text-amber-700">
                          +{welder.overtime.toFixed(2)}ч
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </ScrollArea>

      <div className="bg-white border-t border-gray-200 p-4">
        <div className="flex gap-3">
          <Button 
            variant="outline"
            onClick={() => onNavigate('plan')}
            className="flex-1 h-14 text-lg font-medium"
          >
            <ClipboardList className="mr-2 h-5 w-5" />
            План
          </Button>
          <Button 
            variant="outline"
            onClick={() => onNavigate('norms')}
            className="flex-1 h-14 text-lg font-medium"
          >
            <Ruler className="mr-2 h-5 w-5" />
            Нормы
          </Button>
        </div>
      </div>

      <AlertDialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Удалить сварщика?</AlertDialogTitle>
            <AlertDialogDescription>
              Вы уверены, что хотите удалить сварщика &quot;{deleteConfirm?.name}&quot;? 
              Все записи о его работе будут потеряны.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Отмена</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteConfirm && handleDeleteWelder(deleteConfirm)}
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