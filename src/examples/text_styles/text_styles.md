## Text Styles

<?plotance rows: 1:1:64px:64px ?>

<?plotance body_font_scale: 0.6 ?>

Normal **bold** _italic_ **_bolditalic_** `code` <https://example.org/autolink>
[link](https://example.org)
[link with title](https://example.org/link_with_title "foo")\
hard break

- list item 1
  1. a1
  2. a2
- list item 2
  - list item 2-1
    - list item 2-1-1

<?plotance
  body_font_scale: 0.3
  body_horizontal_align: center
  body_vertical_align: center
?>

small centered text

<?plotance columns: 1:1 ?>

<?plotance
 body_font_scale: 0.6
 body_horizontal_align: right
?>

Image block:\
Inline images are not supported due to limitation of PowerPoint.

![Sky Clouds](image.jpg)

## Language setting

<?plotance body_horizontal_align: left ?>

<?plotance rows: 2:1:1:1:1 ?>

“Same” characters are rendered as different glyphs depending on `language`
option.

<?plotance columns: 200px:1 ?>

<?plotance language: ja-JP ?>

ja-JP:

返 曜 骨 直

<?plotance language: zh-CN ?>

zh-CN:

返 曜 骨 直

<?plotance language: zh-TW ?>

zh-TW:

返 曜 骨 直

<?plotance language: ko ?>

ko:

返 曜 骨 直
