require 'date'

puts("timestamp")

BASE = 500000
SATURDAY = 900000
SUNDAY = 800000

date = Date.new(2025, 1, 1)

(1..31).each do |days|
  count =
    case days % 7
    when 5 then BASE + 20000
    when 6 then BASE + 40000
    when 0 then BASE + 30000
    else BASE
    end

  count += days * 3000
  count += rand(20000) - 10000

  bins = Array.new(24 * 60 * 60, 0)

  count.times do
    bins[rand(24 * 60 * 60)] += 1
  end

  date_string = date.iso8601

  bins.each.with_index do |x, i|
    seconds = i % 60
    minutes = ((i / 60) % 60).to_i
    hours = (i / (60 * 60)).to_i

    x.times do
      printf("#{date_string} %02d:%02d:%02d\n", hours, minutes, seconds)
    end
  end

  date += 1
end

