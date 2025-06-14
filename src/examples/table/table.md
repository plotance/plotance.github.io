## Data Table

```plotance
format: table
body_font_scale: 0.25

# General table options
table_cell_horizontal_align: right
table_cell_vertical_align: center
table_cell_left_margin: 0
table_cell_right_margin: 3pt
table_cell_top_margin: 0
table_cell_bottom_margin: 0

# Border styles
table_top_border_width: 2pt
table_top_border_color: "#000"
table_bottom_border_width: 2pt
table_bottom_border_color: "#000"

# Heading row styles
# default style:
#   first_row_font_color: light1
#   first_row_background_color: accent1
#   first_row_font_weight: bold
first_row_font_color: "#000"
first_row_background_color: "#FFF"
first_row_bottom_border_color: "#000"
first_row_cell_vertical_align: bottom

# Heading column styles
first_column_font_weight: bold
first_column_right_border_color: "#000"

# Summary column styles
last_column_left_border_color: "#000"

# Summary row styles
last_row_top_border_color: "#000"

query: |
  WITH
    pivot_table AS (
      PIVOT (
        SELECT
          year(date) AS year,
          day(date) AS day,
          temperature
        FROM 'table.csv'
      )
      ON year
      USING MAX(temperature)
      GROUP BY day
    ),
    average_by_day AS (
      SELECT
        day(date) AS day,
        AVG(temperature) AS temperature
      FROM 'table.csv'
      GROUP BY day
    ),
    average_by_year AS (
      PIVOT (
        SELECT
          year(date) AS year,
          temperature
        FROM 'table.csv'
      )
      ON year
      USING AVG(temperature)
    )
  SELECT
    pivot_table.day,
    printf('%0.1f', COLUMNS(pivot_table.* EXCLUDE(day))),
    printf('%0.1f', average_by_day.temperature) AS AVG
  FROM
    pivot_table
    JOIN average_by_day USING (day)
  UNION ALL
  SELECT
    'AVG' AS day,
    printf('%0.1f', COLUMNS(*)),
    (
      SELECT printf('%0.1f', AVG(average_by_day.temperature))
      FROM average_by_day
    ) AS average_by_day
  FROM average_by_year;
```
