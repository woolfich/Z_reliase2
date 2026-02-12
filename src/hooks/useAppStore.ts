'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { AppState, Welder, Norm, PlanItem, WorkRecord } from '@/types';
import { generateId, getCurrentDate, calculateWorkTime } from '@/types';

const WORKDAY_HOURS = 8;

interface AppStore extends AppState {
  addWelder: (name: string) => void;
  updateWelder: (id: string, data: Partial<Welder>) => void;
  deleteWelder: (id: string) => void;
  addWorkRecord: (welderId: string, article: string, quantity: number, norms: Norm[]) => void;
  deleteWorkRecord: (welderId: string, recordId: string) => void;
  useOvertime: (welderId: string, date: string, hours: number) => void;
  updateOvertime: (welderId: string, newOvertime: number) => void;
  
  addNorm: (article: string, timePerUnit: number) => void;
  updateNorm: (id: string, article: string, timePerUnit: number) => void;
  deleteNorm: (id: string) => void;
  
  addPlanItem: (article: string, planned: number) => void;
  updatePlanItem: (id: string, planned: number) => void;
  deletePlanItem: (id: string) => void;
  updatePlanCompleted: (article: string, quantity: number) => void;
  
  importData: (data: Partial<AppState>) => void;
  resetData: () => void;
}

const initialState: AppState = {
  welders: [],
  norms: [],
  plan: [],
};

export const useAppStore = create<AppStore>()(
  persist(
    (set, get) => ({
      ...initialState,

      addWelder: (name) => {
        const newWelder: Welder = {
          id: generateId(),
          name,
          workRecords: [],
          overtime: 0,
          timeAdjustments: {},
          createdAt: Date.now(),
          updatedAt: Date.now(),
        };
        set((state) => ({
          welders: [newWelder, ...state.welders],
        }));
      },

      updateWelder: (id, data) => {
        set((state) => ({
          welders: state.welders.map((w) =>
            w.id === id ? { ...w, ...data, updatedAt: Date.now() } : w
          ),
        }));
      },

      deleteWelder: (id) => {
        set((state) => ({
          welders: state.welders.filter((w) => w.id !== id),
        }));
      },

      addWorkRecord: (welderId, article, quantity, norms) => {
        const currentDate = getCurrentDate();
        
        set((state) => {
          const welder = state.welders.find(w => w.id === welderId);
          if (!welder) return state;
          
          const todayRecords = welder.workRecords.filter(r => r.date === currentDate);
          const todayWorkTime = todayRecords.reduce((sum, r) => 
            sum + calculateWorkTime(r.article, r.quantity, norms), 0
          );
          const todayAdjustment = welder.timeAdjustments?.[currentDate] || 0;
          const todayTime = todayWorkTime + todayAdjustment;
          
          const newTime = calculateWorkTime(article, quantity, norms);
          const totalTime = todayTime + newTime;
          
          let newOvertime = welder.overtime;
          if (totalTime > WORKDAY_HOURS) {
            const excess = totalTime - WORKDAY_HOURS;
            newOvertime = welder.overtime + excess;
          }

          const existingRecordIndex = welder.workRecords.findIndex(
            r => r.article === article && r.date === currentDate
          );

          let updatedRecords;
          if (existingRecordIndex >= 0) {
            updatedRecords = [...welder.workRecords];
            updatedRecords[existingRecordIndex] = {
              ...updatedRecords[existingRecordIndex],
              quantity: updatedRecords[existingRecordIndex].quantity + quantity,
              updatedAt: Date.now(),
            };
          } else {
            const newRecord: WorkRecord = {
              id: generateId(),
              article,
              quantity,
              welderId,
              date: currentDate,
              createdAt: Date.now(),
              updatedAt: Date.now(),
            };
            updatedRecords = [newRecord, ...welder.workRecords];
          }

          const updatedWelders = state.welders.map((w) =>
            w.id === welderId
              ? { ...w, workRecords: updatedRecords, overtime: newOvertime, timeAdjustments: welder.timeAdjustments || {}, updatedAt: Date.now() }
              : w
          );

          const updatedPlan = state.plan.map((p) => {
            if (p.article === article) {
              const newCompleted = p.completed + quantity;
              const isComplete = newCompleted >= p.planned;
              return { ...p, completed: newCompleted, isLocked: isComplete, updatedAt: Date.now() };
            }
            return p;
          });

          return { welders: updatedWelders, plan: updatedPlan };
        });
      },

      useOvertime: (welderId, date, hours) => {
        set((state) => {
          const welder = state.welders.find(w => w.id === welderId);
          if (!welder || welder.overtime < hours) return state;

          const currentAdjustment = welder.timeAdjustments?.[date] || 0;
          const timeAdjustments = {
            ...welder.timeAdjustments,
            [date]: currentAdjustment + hours,
          };

          return {
            welders: state.welders.map((w) =>
              w.id === welderId
                ? { 
                    ...w, 
                    overtime: Math.max(0, w.overtime - hours),
                    timeAdjustments,
                    updatedAt: Date.now() 
                  }
                : w
            ),
          };
        });
      },

      updateOvertime: (welderId, newOvertime) => {
        set((state) => ({
          welders: state.welders.map((w) =>
            w.id === welderId
              ? { ...w, overtime: Math.max(0, newOvertime), updatedAt: Date.now() }
              : w
          ),
        }));
      },

      deleteWorkRecord: (welderId, recordId) => {
        set((state) => {
          const welder = state.welders.find(w => w.id === welderId);
          const record = welder?.workRecords.find(r => r.id === recordId);
          if (!record) return state;

          const updatedWelders = state.welders.map((w) =>
            w.id === welderId
              ? {
                  ...w,
                  workRecords: w.workRecords.filter(r => r.id !== recordId),
                  timeAdjustments: w.timeAdjustments || {},
                  updatedAt: Date.now(),
                }
              : w
          );

          const updatedPlan = state.plan.map((p) => {
            if (p.article === record.article) {
              return {
                ...p,
                completed: Math.max(0, p.completed - record.quantity),
                isLocked: false,
                updatedAt: Date.now(),
              };
            }
            return p;
          });

          return { welders: updatedWelders, plan: updatedPlan };
        });
      },

      addNorm: (article, timePerUnit) => {
        const newNorm: Norm = {
          id: generateId(),
          article,
          timePerUnit,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        };
        set((state) => ({
          norms: [newNorm, ...state.norms],
        }));
      },

      updateNorm: (id, article, timePerUnit) => {
        set((state) => ({
          norms: state.norms.map((n) =>
            n.id === id ? { ...n, article, timePerUnit, updatedAt: Date.now() } : n
          ),
        }));
      },

      deleteNorm: (id) => {
        set((state) => ({
          norms: state.norms.filter((n) => n.id !== id),
        }));
      },

      addPlanItem: (article, planned) => {
        set((state) => {
          const existing = state.plan.find(p => p.article === article);
          if (existing) {
            return {
              plan: state.plan.map(p =>
                p.article === article
                  ? { ...p, planned: p.planned + planned, updatedAt: Date.now() }
                  : p
              ),
            };
          }

          const newPlanItem: PlanItem = {
            id: generateId(),
            article,
            planned,
            completed: 0,
            isLocked: false,
            createdAt: Date.now(),
            updatedAt: Date.now(),
          };
          return { plan: [newPlanItem, ...state.plan] };
        });
      },

      updatePlanItem: (id, planned) => {
        set((state) => ({
          plan: state.plan.map((p) =>
            p.id === id ? { ...p, planned, updatedAt: Date.now() } : p
          ),
        }));
      },

      deletePlanItem: (id) => {
        set((state) => ({
          plan: state.plan.filter((p) => p.id !== id),
        }));
      },

      updatePlanCompleted: (article, quantity) => {
        set((state) => ({
          plan: state.plan.map((p) => {
            if (p.article === article) {
              const newCompleted = p.completed + quantity;
              const isComplete = newCompleted >= p.planned;
              return { ...p, completed: newCompleted, isLocked: isComplete, updatedAt: Date.now() };
            }
            return p;
          }),
        }));
      },

      importData: (data) => {
        set((state) => {
          const mergedWelders = [...state.welders];
          const mergedNorms = [...state.norms];
          const mergedPlan = [...state.plan];

          if (data.welders) {
            data.welders.forEach((w) => {
              if (!mergedWelders.find((mw) => mw.name.toLowerCase() === w.name.toLowerCase())) {
                mergedWelders.push({ ...w, id: generateId(), timeAdjustments: w.timeAdjustments || {} });
              }
            });
          }

          if (data.norms) {
            data.norms.forEach((n) => {
              if (!mergedNorms.find((mn) => mn.article === n.article)) {
                mergedNorms.push({ ...n, id: generateId() });
              }
            });
          }

          if (data.plan) {
            data.plan.forEach((p) => {
              const existing = mergedPlan.find((mp) => mp.article === p.article);
              if (existing) {
                existing.planned += p.planned;
                existing.completed += p.completed;
              } else {
                mergedPlan.push({ ...p, id: generateId() });
              }
            });
          }

          return { welders: mergedWelders, norms: mergedNorms, plan: mergedPlan };
        });
      },

      resetData: () => {
        set(initialState);
      },
    }),
    {
      name: 'welders-app-storage',
    }
  )
);

export const selectWelders = (state: AppStore) => state.welders;
export const selectNorms = (state: AppStore) => state.norms;
export const selectPlan = (state: AppStore) => state.plan;