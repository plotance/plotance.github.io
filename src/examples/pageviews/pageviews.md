## Page views of ${year}-${month}

<?plotance rows: 1:48pt ?>

```plotance
format: line
x_axis_label_format: d
x_axis_major_unit: 7 days
legend_position: none
query: |
  SELECT
    date_trunc('day', timestamp) AS date,
    COUNT(*) AS count
  FROM
    read_csv(
      'access_'
      || getvariable('year')
      || '-'
      || getvariable('month')
      || '.csv.gz'
    )
  GROUP BY ALL
  ORDER BY ALL;
```

We are growing!
