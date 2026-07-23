CC = gcc
CFLAGS = -Os -Wall
LIBS = -lsqlite3 -lpthread

all: velocitymind

velocitymind: daemon.c
	$(CC) $(CFLAGS) -o velocitymind daemon.c $(LIBS)

clean:
	rm -f velocitymind
