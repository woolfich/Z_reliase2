'use client';

import React, { useState, useMemo, useSyncExternalStore } from 'react';
import { Screen, Welder } from '@/types';
import { useAppStore } from '@/hooks/useAppStore';
import MainScreen from '@/components/screens/MainScreen';
import NormsScreen from '@/components/screens/NormsScreen';
import PlanScreen from '@/components/screens/PlanScreen';
import WelderCard from '@/components/screens/WelderCard';

// Хук для проверки гидратации zustand
function useHydration() {
  const hydrated = useSyncExternalStore(
    (callback) => useAppStore.persist.onHydrate(callback),
    () => useAppStore.persist.hasHydrated(),
    () => true
  );
  return hydrated;
}

export default function Home() {
  const [currentScreen, setCurrentScreen] = useState<Screen>('main');
  const [selectedWelderId, setSelectedWelderId] = useState<string | null>(null);
  const isHydrated = useHydration();
  
  // Подписываемся на данные из хранилища
  const welders = useAppStore((state) => state.welders);
  const norms = useAppStore((state) => state.norms);
  const plan = useAppStore((state) => state.plan);

  // Навигация между экранами
  const handleNavigate = (screen: Screen, data?: unknown) => {
    if (screen === 'welderCard' && data) {
      setSelectedWelderId((data as Welder).id);
    }
    setCurrentScreen(screen);
  };

  // Возврат на главную
  const handleBackToMain = () => {
    setCurrentScreen('main');
    setSelectedWelderId(null);
  };

  // Получаем выбранного сварщика
  const selectedWelder = useMemo(() => {
    if (!selectedWelderId) return null;
    return welders.find((w) => w.id === selectedWelderId) || null;
  }, [selectedWelderId, welders]);

  // Показываем загрузку до гидратации
  if (!isHydrated) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-emerald-200 border-t-emerald-600 
                        rounded-full animate-spin" />
          <p className="text-gray-500">Загрузка...</p>
        </div>
      </div>
    );
  }

  const state = { welders, norms, plan };

  // Рендер текущего экрана
  const renderScreen = () => {
    switch (currentScreen) {
      case 'norms':
        return (
          <NormsScreen
            state={state}
            onNavigate={handleBackToMain}
          />
        );
      
      case 'plan':
        return (
          <PlanScreen
            state={state}
            onNavigate={handleBackToMain}
          />
        );
      
      case 'welderCard':
        if (!selectedWelder) {
          return (
            <div className="flex items-center justify-center min-h-screen bg-gray-50">
              <div className="text-center p-4">
                <p className="text-gray-500 mb-4">Сварщик не найден</p>
                <button
                  onClick={handleBackToMain}
                  className="px-4 py-2 bg-emerald-600 text-white rounded-lg"
                >
                  На главную
                </button>
              </div>
            </div>
          );
        }
        return (
          <WelderCard
            welder={selectedWelder}
            state={state}
            onNavigate={handleBackToMain}
          />
        );
      
      case 'main':
      default:
        return (
          <MainScreen
            state={state}
            onNavigate={handleNavigate}
          />
        );
    }
  };

  return (
    <main className="min-h-screen bg-gray-50">
      {renderScreen()}
    </main>
  );
}
