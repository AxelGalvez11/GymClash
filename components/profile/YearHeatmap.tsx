import React, { useRef, useEffect, useMemo, useState } from 'react';
import { View, Text, ScrollView, Dimensions } from 'react-native';

interface Props {
  workouts: Array<{
    created_at: string;
    type: string;
  }>;
}

// Color mapping based on workout count
const getHeatmapColor = (count: number): string => {
  if (count === 0) return '#1d1d37'; // inactive
  if (count === 1) return '#7b3bb5'; // dim purple
  if (count === 2) return '#a434ff'; // mid purple
  return '#ce96ff'; // bright purple (3+)
};

// Get shadow for bright purple cells
const getHeatmapShadow = (count: number) => {
  if (count >= 3) {
    return {
      shadowColor: '#ce96ff',
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0.4,
      shadowRadius: 4,
      elevation: 4,
    };
  }
  return {};
};

export function YearHeatmap({ workouts }: Props) {
  const scrollViewRef = useRef<ScrollView>(null);

  // Build 364 days array (52 weeks × 7 days) going backward from today
  const getDates = () => {
    const dates: Date[] = [];
    const today = new Date();
    for (let i = 0; i < 364; i++) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      dates.push(date);
    }
    return dates;
  };

  // Convert date to ISO string (YYYY-MM-DD)
  const dateToISO = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // Count workouts per day with memoization
  const memoizedGetWorkoutCountForDate = useMemo(() => {
    const cache: { [key: string]: number } = {};
    return (date: Date): number => {
      const dateStr = dateToISO(date);
      if (cache[dateStr] !== undefined) {
        return cache[dateStr];
      }
      const count = workouts.filter((w) => w.created_at.startsWith(dateStr)).length;
      cache[dateStr] = count;
      return count;
    };
  }, [workouts]);


  // Extract month labels with starting column index
  const getMonthLabels = (): Array<{ month: string; weekIndex: number }> => {
    const labels: Array<{ month: string; weekIndex: number }> = [];
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    let lastMonth = -1;

    for (let i = 0; i < weeks.length; i++) {
      const firstDayOfWeek = weeks[i][0];
      const currentMonth = firstDayOfWeek.getMonth();
      if (currentMonth !== lastMonth) {
        labels.push({
          month: monthNames[currentMonth],
          weekIndex: i,
        });
        lastMonth = currentMonth;
      }
    }

    return labels;
  };

  // Memoize dates calculation
  const dates = useMemo(() => getDates(), []);

  // Memoize weeks grid structure
  const weeks: Date[][] = useMemo(() => {
    const weekArray: Date[][] = [];
    for (let i = 0; i < 52; i++) {
      const week: Date[] = [];
      for (let j = 0; j < 7; j++) {
        week.push(dates[i * 7 + j]);
      }
      weekArray.push(week);
    }
    return weekArray;
  }, [dates]);

  // Memoize month labels
  const monthLabels = useMemo(() => getMonthLabels(), [weeks]);

  // Track scroll layout readiness
  const [isScrollReady, setIsScrollReady] = useState(false);

  // Scroll to end after layout is ready
  useEffect(() => {
    if (scrollViewRef.current && isScrollReady) {
      scrollViewRef.current.scrollToEnd({ animated: false });
    }
  }, [isScrollReady]);

  // Empty state
  if (workouts.length === 0) {
    return (
      <View style={{ backgroundColor: '#1d1d37', borderRadius: 16, padding: 16, marginBottom: 16 }}>
        <Text style={{ fontFamily: 'Epilogue-Bold', fontSize: 16, color: '#e5e3ff', marginBottom: 4 }}>
          Activity
        </Text>
        <Text style={{ fontFamily: 'Lexend-SemiBold', fontSize: 11, color: '#74738b', marginBottom: 16 }}>
          Past year
        </Text>
        <Text
          style={{
            fontFamily: 'BeVietnamPro-Regular',
            fontSize: 14,
            color: '#74738b',
            textAlign: 'center',
            paddingVertical: 32,
          }}
        >
          Start training to build your streak map
        </Text>
      </View>
    );
  }

  return (
    <View style={{ backgroundColor: '#1d1d37', borderRadius: 16, padding: 16, marginBottom: 16 }}>
      {/* Title and Subtitle */}
      <Text style={{ fontFamily: 'Epilogue-Bold', fontSize: 16, color: '#e5e3ff', marginBottom: 4 }}>
        Activity
      </Text>
      <Text style={{ fontFamily: 'Lexend-SemiBold', fontSize: 11, color: '#74738b', marginBottom: 16 }}>
        Past year
      </Text>

      {/* Month Labels Row */}
      <View style={{ marginBottom: 8, paddingHorizontal: 4 }}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} scrollEnabled={false}>
          <View style={{ flexDirection: 'row' }}>
            {monthLabels.map((label) => (
              <View
                key={`${label.month}-${label.weekIndex}`}
                style={{
                  width: label.weekIndex * 11 + 9,
                  alignItems: 'flex-start',
                }}
              >
                <Text style={{ fontFamily: 'Lexend-SemiBold', fontSize: 9, color: '#aaa8c3' }}>
                  {label.month}
                </Text>
              </View>
            ))}
          </View>
        </ScrollView>
      </View>

      {/* Heatmap Grid */}
      <ScrollView ref={scrollViewRef} horizontal showsHorizontalScrollIndicator={false} onLayout={() => setIsScrollReady(true)}>
        <View style={{ flexDirection: 'row', gap: 2 }}>
          {weeks.map((week, weekIdx) => (
            <View key={weekIdx} style={{ gap: 2 }}>
              {week.map((date, dayIdx) => {
                const count = memoizedGetWorkoutCountForDate(date);
                const backgroundColor = getHeatmapColor(count);
                const shadow = getHeatmapShadow(count);

                return (
                  <View
                    key={dayIdx}
                    style={{
                      width: 9,
                      height: 9,
                      backgroundColor,
                      borderRadius: 1,
                      ...shadow,
                    }}
                  />
                );
              })}
            </View>
          ))}
        </View>
      </ScrollView>

      {/* Legend */}
      <View
        style={{
          marginTop: 16,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'flex-end',
          gap: 6,
        }}
      >
        <Text style={{ fontFamily: 'BeVietnamPro-Regular', fontSize: 9, color: '#74738b' }}>
          Less
        </Text>
        <View style={{ width: 7, height: 7, backgroundColor: '#1d1d37', borderRadius: 1 }} />
        <View style={{ width: 7, height: 7, backgroundColor: '#7b3bb5', borderRadius: 1 }} />
        <View style={{ width: 7, height: 7, backgroundColor: '#a434ff', borderRadius: 1 }} />
        <View style={{ width: 7, height: 7, backgroundColor: '#ce96ff', borderRadius: 1 }} />
        <Text style={{ fontFamily: 'BeVietnamPro-Regular', fontSize: 9, color: '#74738b' }}>
          More
        </Text>
      </View>
    </View>
  );
}
