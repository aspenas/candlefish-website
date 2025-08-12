import React, { useMemo } from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import { useSelector } from 'react-redux';
import { RootState } from '@/store';

// Chart libraries
import {
  LineChart,
  BarChart,
  PieChart,
  AreaChart,
  YAxis,
  XAxis,
  Grid,
} from 'react-native-svg-charts';
import * as shape from 'd3-shape';
import { Circle, G, Line, Text as SvgText, Rect } from 'react-native-svg';

// Types
import { Widget, DataSeries, DataPoint, WidgetType } from '@/types/graphql';

interface ChartRendererProps {
  widget: Widget;
  width?: number;
  height?: number;
  showLabels?: boolean;
  interactive?: boolean;
}

const { width: screenWidth } = Dimensions.get('window');

export const ChartRenderer: React.FC<ChartRendererProps> = ({
  widget,
  width = screenWidth - 32,
  height = 200,
  showLabels = true,
  interactive = true,
}) => {
  const { colorScheme } = useSelector((state: RootState) => state.ui);
  const isDarkMode = colorScheme === 'dark';

  // Process widget data
  const chartData = useMemo(() => {
    if (!widget.data?.series || widget.data.series.length === 0) {
      return null;
    }

    const series = widget.data.series[0]; // Take first series for single-series charts
    return series.data.map((point: DataPoint) => ({
      x: point.x,
      y: typeof point.y === 'number' ? point.y : 0,
      label: point.label,
      color: point.color || series.color || getDefaultColor(0),
    }));
  }, [widget.data]);

  // Multi-series data for line/bar charts
  const multiSeriesData = useMemo(() => {
    if (!widget.data?.series) return [];

    return widget.data.series.map((series: DataSeries, index: number) => ({
      data: series.data.map((point: DataPoint) => ({
        x: point.x,
        y: typeof point.y === 'number' ? point.y : 0,
        label: point.label,
      })),
      svg: {
        stroke: series.color || getDefaultColor(index),
        strokeWidth: 2,
        fill: series.color || getDefaultColor(index),
        fillOpacity: widget.type === WidgetType.AREA_CHART ? 0.3 : 1,
      },
      name: series.name,
    }));
  }, [widget.data, widget.type]);

  // Colors
  const colors = useMemo(() => {
    const baseColors = [
      '#007AFF', '#FF3B30', '#34C759', '#FF9500', '#AF52DE',
      '#FF2D92', '#5AC8FA', '#FFCC00', '#FF6482', '#30D158'
    ];

    if (widget.config?.colors && widget.config.colors.length > 0) {
      return widget.config.colors;
    }

    return baseColors;
  }, [widget.config?.colors]);

  const getDefaultColor = (index: number): string => {
    return colors[index % colors.length];
  };

  // Chart configurations
  const chartConfig = {
    backgroundColor: isDarkMode ? '#1C1C1E' : '#FFFFFF',
    color: isDarkMode ? '#FFFFFF' : '#000000',
    labelColor: isDarkMode ? '#8E8E93' : '#8E8E93',
    gridColor: isDarkMode ? '#38383A' : '#E5E5EA',
  };

  if (!chartData && !multiSeriesData.length) {
    return (
      <View style={[styles.container, { width, height }]}>
        <View style={styles.noDataContainer}>
          <SvgText
            fill={chartConfig.labelColor}
            fontSize="14"
            x={width / 2}
            y={height / 2}
            textAnchor="middle"
          >
            No data available
          </SvgText>
        </View>
      </View>
    );
  }

  // Render different chart types
  const renderChart = () => {
    switch (widget.type) {
      case WidgetType.LINE_CHART:
        return renderLineChart();
      case WidgetType.BAR_CHART:
        return renderBarChart();
      case WidgetType.PIE_CHART:
        return renderPieChart();
      case WidgetType.AREA_CHART:
        return renderAreaChart();
      case WidgetType.METRIC_CARD:
        return renderMetricCard();
      case WidgetType.GAUGE_CHART:
        return renderGaugeChart();
      default:
        return renderLineChart(); // Default fallback
    }
  };

  const renderLineChart = () => {
    if (!multiSeriesData.length) return null;

    const yValues = multiSeriesData.flatMap(series => series.data.map(d => d.y));
    const yMin = Math.min(...yValues);
    const yMax = Math.max(...yValues);

    return (
      <View style={styles.chartContainer}>
        <YAxis
          data={yValues}
          contentInset={{ top: 20, bottom: 20 }}
          svg={{
            fill: chartConfig.labelColor,
            fontSize: 10,
          }}
          numberOfTicks={5}
          formatLabel={(value) => formatValue(value)}
          style={styles.yAxis}
        />
        <View style={{ flex: 1, marginLeft: 10 }}>
          <LineChart
            style={{ height: height - 40 }}
            data={multiSeriesData[0].data}
            svg={multiSeriesData[0].svg}
            contentInset={{ top: 20, bottom: 20, left: 10, right: 10 }}
            curve={shape.curveNatural}
            animate={true}
            animationDuration={300}
          >
            <Grid
              svg={{
                stroke: chartConfig.gridColor,
                strokeWidth: 0.5,
              }}
            />
            {interactive && <Decorator />}
          </LineChart>
          {multiSeriesData.length > 1 && (
            multiSeriesData.slice(1).map((series, index) => (
              <LineChart
                key={index}
                style={StyleSheet.absoluteFillObject}
                data={series.data}
                svg={series.svg}
                contentInset={{ top: 20, bottom: 20, left: 10, right: 10 }}
                curve={shape.curveNatural}
                animate={true}
                animationDuration={300}
              />
            ))
          )}
        </View>
      </View>
    );
  };

  const renderBarChart = () => {
    if (!chartData) return null;

    const yValues = chartData.map(d => d.y);

    return (
      <View style={styles.chartContainer}>
        <YAxis
          data={yValues}
          contentInset={{ top: 20, bottom: 20 }}
          svg={{
            fill: chartConfig.labelColor,
            fontSize: 10,
          }}
          numberOfTicks={5}
          formatLabel={(value) => formatValue(value)}
          style={styles.yAxis}
        />
        <View style={{ flex: 1, marginLeft: 10 }}>
          <BarChart
            style={{ height: height - 40 }}
            data={yValues}
            svg={{ fill: colors[0] }}
            contentInset={{ top: 20, bottom: 20 }}
            animate={true}
            animationDuration={300}
            spacingInner={0.2}
            spacingOuter={0.1}
          >
            <Grid
              svg={{
                stroke: chartConfig.gridColor,
                strokeWidth: 0.5,
              }}
            />
          </BarChart>
        </View>
      </View>
    );
  };

  const renderPieChart = () => {
    if (!chartData) return null;

    const pieData = chartData
      .filter(d => d.y > 0)
      .map((d, index) => ({
        value: d.y,
        svg: { fill: d.color || colors[index % colors.length] },
        key: `pie-${index}`,
        arc: { outerRadius: '80%', padAngle: 0.02 },
      }));

    return (
      <View style={styles.pieContainer}>
        <PieChart
          style={{ height: height - 20 }}
          data={pieData}
          animate={true}
          animationDuration={300}
          innerRadius="30%"
          outerRadius="80%"
          labelRadius="90%"
        />
        {showLabels && (
          <View style={styles.pieLabels}>
            {chartData.map((d, index) => (
              <View key={index} style={styles.pieLabelItem}>
                <View
                  style={[
                    styles.pieLabelColor,
                    { backgroundColor: d.color || colors[index % colors.length] }
                  ]}
                />
                <SvgText
                  fill={chartConfig.color}
                  fontSize="12"
                >
                  {d.label}: {formatValue(d.y)}
                </SvgText>
              </View>
            ))}
          </View>
        )}
      </View>
    );
  };

  const renderAreaChart = () => {
    if (!multiSeriesData.length) return null;

    return (
      <View style={styles.chartContainer}>
        <YAxis
          data={multiSeriesData[0].data.map(d => d.y)}
          contentInset={{ top: 20, bottom: 20 }}
          svg={{
            fill: chartConfig.labelColor,
            fontSize: 10,
          }}
          numberOfTicks={5}
          formatLabel={(value) => formatValue(value)}
          style={styles.yAxis}
        />
        <View style={{ flex: 1, marginLeft: 10 }}>
          <AreaChart
            style={{ height: height - 40 }}
            data={multiSeriesData[0].data}
            svg={multiSeriesData[0].svg}
            contentInset={{ top: 20, bottom: 20, left: 10, right: 10 }}
            curve={shape.curveNatural}
            animate={true}
            animationDuration={300}
          >
            <Grid
              svg={{
                stroke: chartConfig.gridColor,
                strokeWidth: 0.5,
              }}
            />
          </AreaChart>
        </View>
      </View>
    );
  };

  const renderMetricCard = () => {
    if (!widget.data?.summary) return null;

    const { total, trend, changePercent } = widget.data.summary;

    return (
      <View style={[styles.metricCard, { backgroundColor: chartConfig.backgroundColor }]}>
        <SvgText
          fill={chartConfig.color}
          fontSize="32"
          fontWeight="bold"
          textAnchor="middle"
          x={width / 2}
          y={height / 2 - 10}
        >
          {formatValue(total || 0)}
        </SvgText>
        {changePercent && (
          <View style={styles.metricTrend}>
            <SvgText
              fill={changePercent > 0 ? '#34C759' : '#FF3B30'}
              fontSize="14"
              textAnchor="middle"
              x={width / 2}
              y={height / 2 + 20}
            >
              {changePercent > 0 ? '↑' : '↓'} {Math.abs(changePercent).toFixed(1)}%
            </SvgText>
          </View>
        )}
      </View>
    );
  };

  const renderGaugeChart = () => {
    if (!chartData) return null;

    const value = chartData[0]?.y || 0;
    const maxValue = Math.max(...chartData.map(d => d.y));
    const percentage = (value / maxValue) * 100;

    return (
      <View style={styles.gaugeContainer}>
        {/* Gauge implementation would go here */}
        <SvgText
          fill={chartConfig.color}
          fontSize="24"
          textAnchor="middle"
          x={width / 2}
          y={height / 2}
        >
          {formatValue(value)}
        </SvgText>
        <SvgText
          fill={chartConfig.labelColor}
          fontSize="14"
          textAnchor="middle"
          x={width / 2}
          y={height / 2 + 25}
        >
          {percentage.toFixed(1)}%
        </SvgText>
      </View>
    );
  };

  // Decorator component for interactive line charts
  const Decorator = () => {
    return multiSeriesData[0].data.map((value, index) => (
      <Circle
        key={index}
        cx={'20%'}
        cy={20}
        r={4}
        stroke={colors[0]}
        fill={chartConfig.backgroundColor}
      />
    ));
  };

  // Format values for display
  const formatValue = (value: number): string => {
    if (widget.format?.type === 'CURRENCY') {
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
      }).format(value);
    } else if (widget.format?.type === 'PERCENTAGE') {
      return `${value.toFixed(1)}%`;
    } else if (Math.abs(value) >= 1000000) {
      return `${(value / 1000000).toFixed(1)}M`;
    } else if (Math.abs(value) >= 1000) {
      return `${(value / 1000).toFixed(1)}K`;
    } else {
      return value.toFixed(0);
    }
  };

  return (
    <View style={[styles.container, { width, height }]}>
      {renderChart()}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'transparent',
  },
  chartContainer: {
    flex: 1,
    flexDirection: 'row',
    paddingVertical: 10,
  },
  yAxis: {
    width: 50,
  },
  noDataContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  pieContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  pieLabels: {
    position: 'absolute',
    right: 10,
    top: 10,
  },
  pieLabelItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  pieLabelColor: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 6,
  },
  metricCard: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 8,
    padding: 16,
  },
  metricTrend: {
    marginTop: 8,
  },
  gaugeContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
