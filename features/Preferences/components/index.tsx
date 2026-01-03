'use client';
import clsx from 'clsx';
import Themes from './Themes';
import Fonts from './Fonts';
import Behavior from './Behavior';
import Backup from './Backup';
// import GoalTimers from './GoalTimers';
import {
  Joystick,
  Sparkles,
  CaseSensitive,
  Blocks,
  Palette
  // Target
} from 'lucide-react';
import SidebarLayout from '@/shared/components/layout/SidebarLayout';

const Settings = () => {
  return (
    <SidebarLayout>
      <div className='flex flex-col gap-8'>
        <div className='flex flex-col gap-4'>
          <h3 className='flex flex-row items-center gap-2 border-b-2 border-[var(--border-color)] py-6 text-3xl'>
            <Joystick />
            <span>Behavior</span>
          </h3>
          <Behavior />
        </div>
        <div className='flex flex-col gap-4'>
          <h3 className='flex flex-row items-center gap-2 border-b-2 border-[var(--border-color)] py-6 text-3xl'>
            <Palette size={28} />
            <span>Display</span>
          </h3>
          <h3 className='flex flex-row items-center gap-2 border-b-1 border-[var(--border-color)] pb-2 text-2xl'>
            <Sparkles />
            <span>Themes</span>
          </h3>
          <Themes />
        </div>
        <div className='flex flex-col gap-4'>
          <h3 className='flex flex-row items-end gap-2 border-b-1 border-[var(--border-color)] pb-2 text-2xl'>
            <CaseSensitive size={32} />
            <span>Fonts</span>
          </h3>
          <Fonts />
        </div>
        {/* Goal Timers section - commented out
        <div className='flex flex-col gap-4'>
          <h3 className='flex flex-row text-2xl gap-2 items-center pb-2 border-b-1 border-[var(--border-color)]'>
            <Target size={28} />
            <span>Goal Timers</span>
          </h3>
          <GoalTimers />
        </div>
        */}
        <div className='flex flex-col gap-4'>
          <h3 className='flex flex-row items-end gap-2 border-b-1 border-[var(--border-color)] pb-2 text-2xl'>
            <span>Backup</span>
          </h3>
          <Backup />
        </div>
        <div className='mb-12 flex flex-col gap-4'>
          <h3
            className={clsx(
              'flex flex-row items-end gap-2 border-b-0 border-[var(--border-color)] py-6 text-3xl'
            )}
          >
            <Blocks size={32} />
            <span>Coming Soon...</span>
          </h3>
        </div>
      </div>
    </SidebarLayout>
  );
};

export default Settings;
