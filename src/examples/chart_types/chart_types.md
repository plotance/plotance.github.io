## Chart types

<?plotance columns: 1:1:1 ?>

<?plotance
 x_axis_major_unit: 1
 x_axis_minor_unit: 0.5
 x_axis_grid_major_width: 0.5pt
 y_axis_major_unit: 1
 y_axis_minor_unit: 0.5
 y_axis_grid_major_width: 0.5pt
 grid_major_color: "#CCC"
?>

```plotance
format: bar
chart_title: Bar
data_label_position: outside_end
line_width: 1pt
line_color: "#000"
query: SELECT * FROM 'bar.csv';
```

```plotance
format: line
chart_title: Line
query: SELECT * FROM 'line.csv';
```

```plotance
format: area
chart_title: Area
query: SELECT * FROM 'area.csv';
```

```plotance
format: scatter
chart_title: Scatter
x_axis_range_minimum: -6
x_axis_range_maximum: 6
y_axis_range_minimum: -6
y_axis_range_maximum: 6
legend_position: none
query: SELECT * FROM 'scatter.csv';
```

```plotance
format: bubble
chart_title: Bubble
marker_line_width: 1 pt
marker_fill_opacity: 0.8
legend_position: none
query: SELECT * FROM 'bubble.csv';
```

```plotance
format: bar
chart_title: |
  No pie/donut chart.
  Use bar chart.
chart_title_font_size: 12pt
bar_direction: horizontal
bar_grouping: percent_stacked
x_axis_major_unit: 0.5
x_axis_minor_unit: 0.25
x_axis_grid_major_width: 0.5pt
x_axis_grid_minor_width: 0.5pt
x_axis_range_minimum: 0
x_axis_range_maximum: 1
x_axis_label_format: 0%
y_axis_reversed: true
grid_major_color: "#000"
series_colors:
  - "#d6587d"
  - "#dddddd"
  - "#44c976"
query: SELECT * FROM 'percentage.csv';
```
