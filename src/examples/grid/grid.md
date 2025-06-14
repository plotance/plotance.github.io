## Grid

<!-- <?plotance ... ?> and ```plotance ... ``` are interchangeable. -->

<?plotance
 # This slide have three rows, and the first and second row are twice as tall
 # as the third row.
 rows: 2:2:1

 # Each row have two columns.
 columns: 1:1

 body_horizontal_align: right
?>

This is the row 1

```plotance
format: bar
query:
  SELECT * FROM 'grid1.csv'
```

This is the row 2

```plotance
format: bar
query:
  SELECT * FROM 'grid2.csv'
```

<!-- The third row have only one column and centered. -->
<?plotance columns: 1, body_horizontal_align: center ?>

The row 3 have only one column and shorter.
